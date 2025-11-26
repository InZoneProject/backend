import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, LessThan, MoreThan, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Organization } from './entities/organization.entity';
import { OrganizationAdmin } from './entities/organization-admin.entity';
import { Position } from './entities/position.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Building } from '../buildings/entities/building.entity';
import { Floor } from '../buildings/entities/floor.entity';
import { Zone } from '../buildings/entities/zone.entity';
import { Door } from '../buildings/entities/door.entity';
import { InviteToken } from '../global-admin/entities/invite-token.entity';
import { RfidTag } from '../rfid/entities/rfid-tag.entity';
import { RfidReader } from '../rfid/entities/rfid-reader.entity';
import { TagAdmin } from '../tag-admin/entities/tag-admin.entity';
import { OrganizationRequest } from './dto/organization-request.dto';
import { CreateOrganizationResponse } from './dto/create-organization-response.dto';
import { OrganizationListResponseDto } from './dto/organization-list-response.dto';
import { OrganizationItemDto } from './dto/organization-item.dto';
import { InviteResponseDto } from '../global-admin/dto/invite-response.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { UpdatePositionResponseDto } from './dto/update-position-response.dto';
import { UpdateProfileInfoDto } from '../../shared/dto/update-profile-info.dto';
import { UpdateProfilePhotoResponseDto } from '../../shared/dto/update-profile-photo-response.dto';
import { UpdateProfileInfoResponseDto } from '../../shared/dto/update-profile-info-response.dto';
import { OrganizationMemberRawDto } from '../../shared/dto/organization-member-raw.dto';
import { OrganizationMemberRole } from '../../shared/enums/organization-member-role.enum';
import { FileValidator } from '../../shared/validators/file.validator';
import { FileService } from '../../shared/services/file.service';
import { ORGANIZATIONS_CONSTANTS } from './organizations.constants';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';
import { AUTH_CONSTANTS } from '../auth/auth.constants';
import { OrganizationsMapper } from './organizations.mapper';
import { InviteTokenType } from '../global-admin/enums/invite-token-type.enum';
import { TokenService } from '../../shared/services/token.service';
import { OrganizationOwnershipValidator } from '../../shared/validators/organization-ownership.validator';
import { FRONTEND_ROUTES } from '../../shared/constants/frontend-routes.constants';
import { DoorSide } from '../buildings/enums/door-side.enum';
import { UserRole } from '../auth/enums/user-role.enum';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(OrganizationAdmin)
    private readonly organizationAdminRepository: Repository<OrganizationAdmin>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(InviteToken)
    private readonly inviteTokenRepository: Repository<InviteToken>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly organizationOwnershipValidator: OrganizationOwnershipValidator,
    private readonly fileValidator: FileValidator,
    private readonly fileService: FileService,
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
    search?: string,
  ): Promise<OrganizationListResponseDto> {
    await this.validateOrganizationAdmin(organizationAdminId);

    const whereClause = {
      organization_admin: { organization_admin_id: organizationAdminId },
      ...(search && { title: ILike(`%${search}%`) }),
    };

    const [organizations, total] =
      await this.organizationRepository.findAndCount({
        where: whereClause,
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

  async createPosition(
    userId: number,
    createPositionDto: CreatePositionDto,
  ): Promise<Position> {
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      createPositionDto.organization_id,
    );

    const position = this.positionRepository.create({
      role: createPositionDto.role,
      description: createPositionDto.description || null,
      organization: { organization_id: createPositionDto.organization_id },
    });

    return this.positionRepository.save(position);
  }

  async updatePosition(
    userId: number,
    positionId: number,
    updatePositionDto: UpdatePositionDto,
  ): Promise<UpdatePositionResponseDto> {
    const position = await this.positionRepository.findOne({
      where: { position_id: positionId },
      relations: ['organization'],
    });

    if (!position) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.POSITION_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      position.organization.organization_id,
    );

    position.role = updatePositionDto.role;
    if (updatePositionDto.description !== undefined) {
      position.description = updatePositionDto.description;
    }
    await this.positionRepository.save(position);

    return {
      role: position.role,
      description: position.description ?? undefined,
    };
  }

  async deletePosition(userId: number, positionId: number): Promise<void> {
    const position = await this.positionRepository.findOne({
      where: { position_id: positionId },
      relations: ['organization'],
    });

    if (!position) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.POSITION_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      position.organization.organization_id,
    );

    await this.positionRepository.delete(positionId);
  }

  async updateAdminProfilePhoto(
    organizationAdminId: number,
    photo: Express.Multer.File,
  ): Promise<UpdateProfilePhotoResponseDto> {
    this.fileValidator.validateImageFile(photo);

    const organizationAdmin = await this.organizationAdminRepository.findOne({
      where: { organization_admin_id: organizationAdminId },
    });

    if (!organizationAdmin) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.ORGANIZATION_ADMIN_NOT_FOUND,
      );
    }

    if (organizationAdmin.photo) {
      await this.fileService.deleteFile(organizationAdmin.photo);
    }

    organizationAdmin.photo = photo.path;
    await this.organizationAdminRepository.save(organizationAdmin);

    return { photo: organizationAdmin.photo };
  }

  async updateAdminProfileInfo(
    organizationAdminId: number,
    updateInfoDto: UpdateProfileInfoDto,
  ): Promise<UpdateProfileInfoResponseDto> {
    const organizationAdmin = await this.organizationAdminRepository.findOne({
      where: { organization_admin_id: organizationAdminId },
    });

    if (!organizationAdmin) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.ORGANIZATION_ADMIN_NOT_FOUND,
      );
    }

    organizationAdmin.full_name = updateInfoDto.name;
    if (updateInfoDto.phone_number !== undefined) {
      organizationAdmin.phone = updateInfoDto.phone_number;
    }
    await this.organizationAdminRepository.save(organizationAdmin);

    return {
      name: organizationAdmin.full_name,
      phone_number: organizationAdmin.phone,
    };
  }

  async getOrganizationInfo(
    organizationAdminId: number,
    organizationId: number,
  ): Promise<
    Pick<
      Organization,
      'organization_id' | 'title' | 'description' | 'created_at'
    >
  > {
    const organization =
      await this.organizationOwnershipValidator.validateOwnership(
        organizationAdminId,
        organizationId,
      );

    return {
      organization_id: organization.organization_id,
      title: organization.title,
      description: organization.description,
      created_at: organization.created_at,
    };
  }

  async getBuildingsList(
    organizationAdminId: number,
    organizationId: number,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ) {
    await this.organizationOwnershipValidator.validateOwnership(
      organizationAdminId,
      organizationId,
    );

    return await this.dataSource.getRepository(Building).find({
      where: { organization: { organization_id: organizationId } },
      select: ['building_id', 'title', 'address'],
      skip: offset,
      take: limit,
    });
  }

  async getPositionsList(
    organizationAdminId: number,
    organizationId: number,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ) {
    await this.organizationOwnershipValidator.validateOwnership(
      organizationAdminId,
      organizationId,
    );

    return await this.positionRepository.find({
      where: { organization: { organization_id: organizationId } },
      select: ['position_id', 'role', 'description', 'created_at'],
      skip: offset,
      take: limit,
    });
  }

  async getRfidTagsList(
    organizationAdminId: number,
    organizationId: number,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ) {
    await this.organizationOwnershipValidator.validateOwnership(
      organizationAdminId,
      organizationId,
    );

    return await this.dataSource.getRepository(RfidTag).find({
      where: { organization: { organization_id: organizationId } },
      select: ['rfid_tag_id', 'created_at'],
      skip: offset,
      take: limit,
    });
  }

  async getRfidReadersList(
    organizationAdminId: number,
    organizationId: number,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ) {
    await this.organizationOwnershipValidator.validateOwnership(
      organizationAdminId,
      organizationId,
    );

    return await this.dataSource.getRepository(RfidReader).find({
      where: { organization: { organization_id: organizationId } },
      select: ['rfid_reader_id', 'secret_token', 'created_at'],
      skip: offset,
      take: limit,
    });
  }

  async assignPositionToEmployee(
    userId: number,
    employeeId: number,
    positionId: number,
  ): Promise<void> {
    const employee = await this.dataSource.getRepository(Employee).findOne({
      where: { employee_id: employeeId },
      relations: ['positions', 'organizations'],
    });

    if (!employee) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    const position = await this.positionRepository.findOne({
      where: { position_id: positionId },
      relations: ['organization'],
    });

    if (!position) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.POSITION_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      position.organization.organization_id,
    );

    const belongsToOrganization = employee.organizations?.some(
      (org) => org.organization_id === position.organization.organization_id,
    );

    if (!belongsToOrganization) {
      throw new BadRequestException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_IN_ORGANIZATION,
      );
    }

    if (!employee.positions) {
      employee.positions = [];
    }

    const alreadyAssigned = employee.positions.some(
      (p) => p.position_id === position.position_id,
    );

    if (alreadyAssigned) {
      throw new ConflictException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.POSITION_ALREADY_ASSIGNED,
      );
    }

    employee.positions.push(position);
    await this.dataSource.getRepository(Employee).save(employee);
  }

  async removePositionFromEmployee(
    userId: number,
    employeeId: number,
    positionId: number,
  ): Promise<void> {
    const employee = await this.dataSource.getRepository(Employee).findOne({
      where: { employee_id: employeeId },
      relations: ['positions'],
    });

    if (!employee) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    const position = await this.positionRepository.findOne({
      where: { position_id: positionId },
      relations: ['organization'],
    });

    if (!position) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.POSITION_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      position.organization.organization_id,
    );

    if (!employee.positions || employee.positions.length === 0) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.POSITION_NOT_ASSIGNED,
      );
    }

    const positionIndex = employee.positions.findIndex(
      (p) => p.position_id === positionId,
    );

    if (positionIndex === -1) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.POSITION_NOT_ASSIGNED,
      );
    }

    employee.positions.splice(positionIndex, 1);
    await this.dataSource.getRepository(Employee).save(employee);
  }

  async getProfile(userId: number) {
    const orgAdmin = await this.organizationAdminRepository.findOne({
      where: { organization_admin_id: userId },
    });

    if (!orgAdmin) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.ORGANIZATION_ADMIN_NOT_FOUND,
      );
    }

    return {
      organization_admin_id: orgAdmin.organization_admin_id,
      full_name: orgAdmin.full_name,
      email: orgAdmin.email,
      phone: orgAdmin.phone,
      photo: orgAdmin.photo,
    };
  }

  async getOrganizationMembers(
    userId: number,
    organizationId: number,
    search?: string,
    offset: number = 0,
    limit: number = 20,
  ) {
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      organizationId,
    );

    const orgAdmins = this.dataSource
      .createQueryBuilder(OrganizationAdmin, 'org_admin')
      .leftJoin('org_admin.organizations', 'org')
      .where('org.organization_id = :organizationId', { organizationId })
      .andWhere(
        search ? 'org_admin.full_name ILIKE :search' : '1=1',
        search ? { search: `%${search}%` } : {},
      )
      .select('org_admin.organization_admin_id', 'id')
      .addSelect('org_admin.full_name', 'full_name')
      .addSelect('org_admin.email', 'email')
      .addSelect('org_admin.photo', 'photo')
      .addSelect(`'${OrganizationMemberRole.ORGANIZATION_ADMIN}'`, 'role')
      .addSelect('org_admin.created_at', 'created_at')
      .addSelect('1', 'sort_order')
      .addSelect('ARRAY[]::integer[]', 'position_ids');

    const tagAdmins = this.dataSource
      .createQueryBuilder(TagAdmin, 'tag_admin')
      .where('tag_admin.organization_id = :organizationId', { organizationId })
      .andWhere(
        search ? 'tag_admin.full_name ILIKE :search' : '1=1',
        search ? { search: `%${search}%` } : {},
      )
      .select('tag_admin.tag_admin_id', 'id')
      .addSelect('tag_admin.full_name', 'full_name')
      .addSelect('tag_admin.email', 'email')
      .addSelect('tag_admin.photo', 'photo')
      .addSelect(`'${OrganizationMemberRole.TAG_ADMIN}'`, 'role')
      .addSelect('tag_admin.created_at', 'created_at')
      .addSelect('2', 'sort_order')
      .addSelect('ARRAY[]::integer[]', 'position_ids');

    const employees = this.dataSource
      .createQueryBuilder(Employee, 'employee')
      .leftJoin('employee.organizations', 'emp_org')
      .leftJoin('employee.positions', 'emp_pos')
      .where('emp_org.organization_id = :organizationId', { organizationId })
      .andWhere(
        search ? 'employee.full_name ILIKE :search' : '1=1',
        search ? { search: `%${search}%` } : {},
      )
      .select('employee.employee_id', 'id')
      .addSelect('employee.full_name', 'full_name')
      .addSelect('employee.email', 'email')
      .addSelect('employee.photo', 'photo')
      .addSelect(`'${OrganizationMemberRole.EMPLOYEE}'`, 'role')
      .addSelect('employee.created_at', 'created_at')
      .addSelect('3', 'sort_order')
      .addSelect('ARRAY_AGG(DISTINCT emp_pos.position_id)', 'position_ids')
      .groupBy('employee.employee_id')
      .addGroupBy('employee.full_name')
      .addGroupBy('employee.email')
      .addGroupBy('employee.photo')
      .addGroupBy('employee.created_at');

    const orgAdminsResults =
      await orgAdmins.getRawMany<OrganizationMemberRawDto>();
    const tagAdminsResults =
      await tagAdmins.getRawMany<OrganizationMemberRawDto>();
    const employeesResults =
      await employees.getRawMany<OrganizationMemberRawDto>();

    const allResults: OrganizationMemberRawDto[] = [
      ...orgAdminsResults,
      ...tagAdminsResults,
      ...employeesResults,
    ];

    allResults.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    const paginatedResults = allResults.slice(offset, offset + limit);

    const positionIds = paginatedResults
      .flatMap((r) => r.position_ids || [])
      .filter((id): id is number => id !== null);

    const positions =
      positionIds.length > 0
        ? await this.positionRepository.find({
            where: positionIds.map((id) => ({ position_id: id })),
            select: ['position_id', 'role', 'description', 'created_at'],
          })
        : [];

    return paginatedResults.map((result: OrganizationMemberRawDto) => ({
      id: result.id,
      full_name: result.full_name,
      email: result.email,
      photo: result.photo,
      role: result.role,
      ...(result.role === OrganizationMemberRole.EMPLOYEE && {
        positions:
          result.position_ids && result.position_ids[0] !== null
            ? positions.filter((p) =>
                result.position_ids?.includes(p.position_id),
              )
            : [],
      }),
      created_at: result.created_at,
    }));
  }

  private async validateOrganizationMembership(
    userId: number,
    userRole: UserRole,
    organizationId: number,
  ): Promise<void> {
    if (userRole === UserRole.ORGANIZATION_ADMIN) {
      await this.organizationOwnershipValidator.validateOwnership(
        userId,
        organizationId,
      );
      return;
    }

    if (userRole === UserRole.TAG_ADMIN) {
      const tagAdmin = await this.dataSource.getRepository(TagAdmin).findOne({
        where: {
          tag_admin_id: userId,
          organization: { organization_id: organizationId },
        },
      });
      if (!tagAdmin) {
        throw new NotFoundException(
          ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.ACCESS_DENIED,
        );
      }
      return;
    }

    if (userRole === UserRole.EMPLOYEE) {
      const employee = await this.dataSource
        .getRepository(Employee)
        .createQueryBuilder('employee')
        .leftJoin('employee.organizations', 'org')
        .where('employee.employee_id = :userId', { userId })
        .andWhere('org.organization_id = :organizationId', { organizationId })
        .getOne();
      if (!employee) {
        throw new NotFoundException(
          ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.ACCESS_DENIED,
        );
      }
      return;
    }

    throw new NotFoundException(
      ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.ACCESS_DENIED,
    );
  }

  async getMemberProfile(
    userId: number,
    userRole: UserRole,
    organizationId: number,
    memberId: number,
    role: OrganizationMemberRole,
  ) {
    if (
      role !== OrganizationMemberRole.ORGANIZATION_ADMIN &&
      role !== OrganizationMemberRole.TAG_ADMIN &&
      role !== OrganizationMemberRole.EMPLOYEE
    ) {
      throw new BadRequestException('Invalid role');
    }

    await this.validateOrganizationMembership(userId, userRole, organizationId);

    if (role === OrganizationMemberRole.ORGANIZATION_ADMIN) {
      const orgAdmin = await this.organizationAdminRepository
        .createQueryBuilder('org_admin')
        .leftJoin('org_admin.organizations', 'org')
        .where('org_admin.organization_admin_id = :memberId', { memberId })
        .andWhere('org.organization_id = :organizationId', { organizationId })
        .getOne();

      if (!orgAdmin) {
        throw new NotFoundException(
          ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.ORGANIZATION_ADMIN_NOT_FOUND,
        );
      }

      return {
        id: orgAdmin.organization_admin_id,
        full_name: orgAdmin.full_name,
        email: orgAdmin.email,
        phone: orgAdmin.phone,
        photo: orgAdmin.photo,
        role: OrganizationMemberRole.ORGANIZATION_ADMIN,
        created_at: orgAdmin.created_at,
      };
    }

    if (role === OrganizationMemberRole.TAG_ADMIN) {
      const tagAdmin = await this.dataSource
        .getRepository(TagAdmin)
        .createQueryBuilder('tag_admin')
        .where('tag_admin.tag_admin_id = :memberId', { memberId })
        .andWhere('tag_admin.organization_id = :organizationId', {
          organizationId,
        })
        .getOne();

      if (!tagAdmin) {
        throw new NotFoundException(
          ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
        );
      }

      return {
        id: tagAdmin.tag_admin_id,
        full_name: tagAdmin.full_name,
        email: tagAdmin.email,
        phone: tagAdmin.phone,
        photo: tagAdmin.photo,
        role: OrganizationMemberRole.TAG_ADMIN,
        created_at: tagAdmin.created_at,
      };
    }

    const employee = await this.dataSource
      .getRepository(Employee)
      .createQueryBuilder('employee')
      .leftJoin('employee.organizations', 'org')
      .leftJoinAndSelect('employee.positions', 'positions')
      .where('employee.employee_id = :memberId', { memberId })
      .andWhere('org.organization_id = :organizationId', { organizationId })
      .getOne();

    if (!employee) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    return {
      id: employee.employee_id,
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      photo: employee.photo,
      role: OrganizationMemberRole.EMPLOYEE,
      positions: employee.positions || [],
      created_at: employee.created_at,
    };
  }

  async removeTagAdmin(
    userId: number,
    organizationId: number,
    tagAdminId: number,
  ): Promise<void> {
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      organizationId,
    );

    const tagAdmin = await this.dataSource.getRepository(TagAdmin).findOne({
      where: {
        tag_admin_id: tagAdminId,
        organization: { organization_id: organizationId },
      },
    });

    if (!tagAdmin) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    await this.dataSource.getRepository(TagAdmin).remove(tagAdmin);
  }

  async removeEmployee(
    userId: number,
    organizationId: number,
    employeeId: number,
  ): Promise<void> {
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      organizationId,
    );

    const employee = await this.dataSource.getRepository(Employee).findOne({
      where: { employee_id: employeeId },
      relations: ['organizations'],
    });

    if (!employee) {
      throw new NotFoundException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    const belongsToOrganization = employee.organizations?.some(
      (org) => org.organization_id === organizationId,
    );

    if (!belongsToOrganization) {
      throw new BadRequestException(
        ORGANIZATIONS_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_IN_ORGANIZATION,
      );
    }

    employee.organizations = employee.organizations.filter(
      (org) => org.organization_id !== organizationId,
    );

    await this.dataSource.getRepository(Employee).save(employee);
  }

  async deleteProfile(organizationAdminId: number): Promise<void> {
    const organizationAdmin =
      await this.validateOrganizationAdmin(organizationAdminId);

    await this.organizationAdminRepository.remove(organizationAdmin);
  }
}
