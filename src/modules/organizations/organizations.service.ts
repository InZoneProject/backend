import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, MoreThan, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Organization } from './entities/organization.entity';
import { OrganizationAdmin } from './entities/organization-admin.entity';
import { Building } from '../buildings/entities/building.entity';
import { Floor } from '../buildings/entities/floor.entity';
import { Zone } from '../buildings/entities/zone.entity';
import { Door } from '../buildings/entities/door.entity';
import { InviteToken } from '../global-admin/entities/invite-token.entity';
import { OrganizationRequest } from './dto/organization-request.dto';
import { CreateOrganizationResponse } from './dto/create-organization-response.dto';
import { OrganizationListResponseDto } from './dto/organization-list-response.dto';
import { OrganizationItemDto } from './dto/organization-item.dto';
import { InviteResponseDto } from '../global-admin/dto/invite-response.dto';
import { ORGANIZATIONS_CONSTANTS } from './organizations.constants';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';
import { AUTH_CONSTANTS } from '../auth/auth.constants';
import { OrganizationsMapper } from './organizations.mapper';
import { InviteTokenType } from '../global-admin/enums/invite-token-type.enum';
import { TokenService } from '../../shared/services/token.service';
import { OrganizationOwnershipValidator } from '../../shared/validators/organization-ownership.validator';
import { FRONTEND_ROUTES } from '../../shared/constants/frontend-routes.constants';
import { DoorSide } from '../buildings/enums/door-side.enum';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(OrganizationAdmin)
    private readonly organizationAdminRepository: Repository<OrganizationAdmin>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(InviteToken)
    private readonly inviteTokenRepository: Repository<InviteToken>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly organizationOwnershipValidator: OrganizationOwnershipValidator,
  ) {}

  async createOrganization(
    organizationAdminId: number,
    createOrganizationDto: OrganizationRequest,
  ): Promise<CreateOrganizationResponse> {
    const organizationAdmin =
      await this.validateOrganizationAdmin(organizationAdminId);

    return await this.dataSource.transaction(async (manager) => {
      const organization = manager.create(Organization, {
        ...createOrganizationDto,
        organization_admin: organizationAdmin,
      });
      await manager.save(organization);

      const building = manager.create(Building, {
        address: createOrganizationDto.description,
        organization,
      });
      await manager.save(building);

      const floor = manager.create(Floor, {
        building,
      });
      await manager.save(floor);

      const zone = manager.create(Zone, {
        floor,
        building,
      });
      await manager.save(zone);

      const door = manager.create(Door, {
        zone_to: zone,
        is_entrance: true,
        entrance_door_side: DoorSide.BOTTOM,
        floor: floor,
      });
      await manager.save(door);

      return OrganizationsMapper.toCreateOrganizationResponse(
        organization,
        building,
        floor,
        zone,
        door,
      );
    });
  }

  async deleteOrganization(
    organizationAdminId: number,
    organizationId: number,
  ): Promise<void> {
    const organization =
      await this.organizationOwnershipValidator.validateOwnership(
        organizationAdminId,
        organizationId,
      );

    await this.organizationRepository.remove(organization);
  }

  private async validateOrganizationAdmin(
    organizationAdminId: number,
  ): Promise<OrganizationAdmin> {
    const organizationAdmin = await this.organizationAdminRepository.findOne({
      where: { organization_admin_id: organizationAdminId },
    });

    if (!organizationAdmin) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.ORGANIZATION_ADMIN_NOT_FOUND,
      );
    }

    return organizationAdmin;
  }

  async getOrganizations(
    organizationAdminId: number,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ): Promise<OrganizationListResponseDto> {
    await this.validateOrganizationAdmin(organizationAdminId);

    const [organizations, total] =
      await this.organizationRepository.findAndCount({
        where: {
          organization_admin: { organization_admin_id: organizationAdminId },
        },
        order: { created_at: 'DESC' },
        skip: offset,
        take: limit,
      });

    return {
      items: organizations.map((org) =>
        OrganizationsMapper.toOrganizationItemDto(org),
      ),
      total,
    };
  }

  async updateOrganization(
    organizationAdminId: number,
    organizationId: number,
    updateOrganizationDto: OrganizationRequest,
  ): Promise<OrganizationItemDto> {
    const organization =
      await this.organizationOwnershipValidator.validateOwnership(
        organizationAdminId,
        organizationId,
      );

    Object.assign(organization, updateOrganizationDto);
    await this.organizationRepository.save(organization);

    return OrganizationsMapper.toOrganizationItemDto(organization);
  }

  async generateTagAdminInvite(
    organizationAdminId: number,
    organizationId: number,
  ): Promise<InviteResponseDto> {
    await this.deleteExpiredUnusedTokens(organizationId);

    const organization =
      await this.organizationOwnershipValidator.validateOwnership(
        organizationAdminId,
        organizationId,
      );

    const existingToken = await this.findActiveTagAdminToken(organizationId);
    if (existingToken) {
      throw new ConflictException(
        AUTH_CONSTANTS.ERROR_MESSAGES.ACTIVE_INVITE_TOKEN_EXISTS,
      );
    }

    const invite_token = this.tokenService.createJwtToken(
      InviteTokenType.TAG_ADMIN_INVITE,
    );
    const token_encrypted = this.tokenService.encryptToken(invite_token);
    const expires_at = this.tokenService.calculateExpirationDate();

    await this.inviteTokenRepository.save({
      token_encrypted,
      expires_at,
      is_used: false,
      invite_type: InviteTokenType.TAG_ADMIN_INVITE,
      organization,
    });

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    return {
      invite_url: `${frontendUrl}${FRONTEND_ROUTES.REGISTER_TAG_ADMIN}?token=${invite_token}`,
      expires_at,
    };
  }

  private async deleteExpiredUnusedTokens(
    organizationId: number,
  ): Promise<void> {
    await this.inviteTokenRepository.delete({
      expires_at: LessThan(new Date()),
      is_used: false,
      invite_type: InviteTokenType.TAG_ADMIN_INVITE,
      organization: { organization_id: organizationId },
    });
  }

  private async findActiveTagAdminToken(organizationId: number) {
    return this.inviteTokenRepository.findOne({
      where: {
        is_used: false,
        expires_at: MoreThan(new Date()),
        invite_type: InviteTokenType.TAG_ADMIN_INVITE,
        organization: { organization_id: organizationId },
      },
    });
  }

  async generateEmployeeInvite(
    organizationAdminId: number,
    organizationId: number,
  ): Promise<InviteResponseDto> {
    await this.deleteExpiredUnusedEmployeeTokens(organizationId);

    const organization =
      await this.organizationOwnershipValidator.validateOwnership(
        organizationAdminId,
        organizationId,
      );

    const existingToken = await this.findActiveEmployeeToken(organizationId);
    if (existingToken) {
      throw new ConflictException(
        AUTH_CONSTANTS.ERROR_MESSAGES.ACTIVE_INVITE_TOKEN_EXISTS,
      );
    }

    const invite_token = this.tokenService.createJwtToken(
      InviteTokenType.EMPLOYEE_INVITE,
    );
    const token_encrypted = this.tokenService.encryptToken(invite_token);
    const expires_at = this.tokenService.calculateExpirationDate();

    await this.inviteTokenRepository.save({
      token_encrypted,
      expires_at,
      is_used: false,
      invite_type: InviteTokenType.EMPLOYEE_INVITE,
      organization,
    });

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    return {
      invite_url: `${frontendUrl}${FRONTEND_ROUTES.JOIN_ORGANIZATION}?token=${invite_token}`,
      expires_at,
    };
  }

  private async deleteExpiredUnusedEmployeeTokens(
    organizationId: number,
  ): Promise<void> {
    await this.inviteTokenRepository.delete({
      expires_at: LessThan(new Date()),
      is_used: false,
      invite_type: InviteTokenType.EMPLOYEE_INVITE,
      organization: { organization_id: organizationId },
    });
  }

  private async findActiveEmployeeToken(organizationId: number) {
    return this.inviteTokenRepository.findOne({
      where: {
        is_used: false,
        expires_at: MoreThan(new Date()),
        invite_type: InviteTokenType.EMPLOYEE_INVITE,
        organization: { organization_id: organizationId },
      },
    });
  }

  async getTagAdminInviteStatus(
    organizationAdminId: number,
    organizationId: number,
  ): Promise<InviteResponseDto | null> {
    await this.organizationOwnershipValidator.validateOwnership(
      organizationAdminId,
      organizationId,
    );

    const storedToken = await this.findActiveTagAdminToken(organizationId);

    if (!storedToken) {
      return null;
    }

    const invite_token = this.tokenService.decryptToken(
      storedToken.token_encrypted,
    );
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    return {
      invite_url: `${frontendUrl}${FRONTEND_ROUTES.REGISTER_TAG_ADMIN}?token=${invite_token}`,
      expires_at: storedToken.expires_at,
    };
  }

  async getEmployeeInviteStatus(
    organizationAdminId: number,
    organizationId: number,
  ): Promise<InviteResponseDto | null> {
    await this.organizationOwnershipValidator.validateOwnership(
      organizationAdminId,
      organizationId,
    );

    const storedToken = await this.findActiveEmployeeToken(organizationId);

    if (!storedToken) {
      return null;
    }

    const invite_token = this.tokenService.decryptToken(
      storedToken.token_encrypted,
    );
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    return {
      invite_url: `${frontendUrl}${FRONTEND_ROUTES.JOIN_ORGANIZATION}?token=${invite_token}`,
      expires_at: storedToken.expires_at,
    };
  }
}
