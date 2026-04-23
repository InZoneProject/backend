import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AUTH_CONSTANTS } from '../auth/auth.constants';
import { GLOBAL_ADMIN_CONSTANTS } from './global-admin.constants';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';
import { InviteToken } from './entities/invite-token.entity';
import { OrganizationAdmin } from '../organizations/entities/organization-admin.entity';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InviteHistoryResponseDto } from './dto/invite-history-response.dto';
import { OrganizationAdminListResponseDto } from './dto/organization-admin-list-response.dto';
import { InviteTokenType } from './enums/invite-token-type.enum';
import { GlobalAdminMapper } from './global-admin.mapper';
import { InviteTokenService } from '../../shared/services/invite-token.service';
import { FRONTEND_ROUTES } from '../../shared/constants/frontend-routes.constants';

@Injectable()
export class GlobalAdminService {
  constructor(
    @InjectRepository(InviteToken)
    private inviteTokenRepository: Repository<InviteToken>,
    @InjectRepository(OrganizationAdmin)
    private organizationAdminRepository: Repository<OrganizationAdmin>,
    private inviteTokenService: InviteTokenService,
  ) {}

  async generateInviteToken(): Promise<InviteResponseDto> {
    await this.inviteTokenService.deleteExpiredUnusedTokens({
      tokenType: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
    });

    const existingToken = await this.inviteTokenService.findActiveToken({
      tokenType: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
    });

    if (existingToken) {
      throw new ConflictException(
        AUTH_CONSTANTS.ERROR_MESSAGES.ACTIVE_INVITE_TOKEN_EXISTS,
      );
    }

    return this.inviteTokenService.generateInviteToken({
      tokenType: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
      frontendPath: FRONTEND_ROUTES.REGISTER_ORGANIZATION_ADMIN,
    });
  }

  async getValidInviteToken(): Promise<InviteResponseDto | null> {
    const storedToken = await this.inviteTokenService.findActiveToken({
      tokenType: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
    });

    return this.inviteTokenService.getInviteStatus(
      storedToken,
      FRONTEND_ROUTES.REGISTER_ORGANIZATION_ADMIN,
    );
  }

  async getInviteHistory(
    search?: string,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ): Promise<InviteHistoryResponseDto> {
    const query = this.inviteTokenRepository
      .createQueryBuilder('token')
      .innerJoinAndSelect('token.used_by_organization_admin', 'admin')
      .where('token.is_used = :isUsed', { isUsed: true })
      .andWhere('token.invite_type = :inviteType', {
        inviteType: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
      });

    if (search) {
      query.andWhere(
        '(admin.full_name ILIKE :search OR admin.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [tokens, total] = await query
      .orderBy('token.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const items = tokens.map((token) =>
      GlobalAdminMapper.toInviteHistoryItemDto(token),
    );

    return {
      items,
      total,
    };
  }

  async getAllOrganizationAdmins(
    search?: string,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ): Promise<OrganizationAdminListResponseDto> {
    const query = this.organizationAdminRepository
      .createQueryBuilder('admin')
      .leftJoinAndSelect('admin.organizations', 'org');

    if (search) {
      query.andWhere(
        '(admin.full_name ILIKE :search OR admin.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await query
      .orderBy('admin.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((admin) =>
        GlobalAdminMapper.toOrganizationAdminItemDto(admin),
      ),
      total,
    };
  }

  async deleteOrganizationAdmin(id: number): Promise<void> {
    const admin = await this.organizationAdminRepository.findOne({
      where: { organization_admin_id: id },
    });

    if (!admin) {
      throw new NotFoundException(
        GLOBAL_ADMIN_CONSTANTS.ERROR_MESSAGES.ORGANIZATION_ADMIN_NOT_FOUND.replace(
          '$id',
          id.toString(),
        ),
      );
    }

    await this.organizationAdminRepository.remove(admin);
  }
}
