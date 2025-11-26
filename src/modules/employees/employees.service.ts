import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { InviteToken } from '../global-admin/entities/invite-token.entity';
import { Position } from '../organizations/entities/position.entity';
import { JoinOrganizationDto } from './dto/join-organization.dto';
import { JoinOrganizationResponseDto } from './dto/join-organization-response.dto';
import { InviteTokenType } from '../global-admin/enums/invite-token-type.enum';
import { InviteTokenService } from '../../shared/services/invite-token.service';
import { UpdateProfileInfoDto } from '../../shared/dto/update-profile-info.dto';
import { UpdateProfilePhotoResponseDto } from '../../shared/dto/update-profile-photo-response.dto';
import { UpdateProfileInfoResponseDto } from '../../shared/dto/update-profile-info-response.dto';
import { OrganizationMemberRawDto } from '../../shared/dto/organization-member-raw.dto';
import { OrganizationMemberRole } from '../../shared/enums/organization-member-role.enum';
import { FileValidator } from '../../shared/validators/file.validator';
import { FileService } from '../../shared/services/file.service';
import { AUTH_CONSTANTS } from '../auth/auth.constants';
import { EMPLOYEES_CONSTANTS } from './employees.constants';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(InviteToken)
    private readonly inviteTokenRepository: Repository<InviteToken>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    private readonly inviteTokenService: InviteTokenService,
    private readonly fileValidator: FileValidator,
    private readonly fileService: FileService,
  ) {}

  async joinOrganization(
    employeeId: number,
    joinDto: JoinOrganizationDto,
  ): Promise<JoinOrganizationResponseDto> {
    const inviteToken = await this.inviteTokenService.validateInviteToken(
      joinDto.token,
      InviteTokenType.EMPLOYEE_INVITE,
    );

    if (!inviteToken.organization) {
      throw new NotFoundException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_INVITE_TOKEN,
      );
    }

    const employee = await this.employeeRepository.findOne({
      where: { employee_id: employeeId },
      relations: ['organizations'],
    });

    if (!employee) {
      throw new NotFoundException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    if (!employee.is_consent_given && !joinDto.consent_given) {
      throw new BadRequestException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.CONSENT_REQUIRED,
      );
    }

    if (!employee.is_consent_given) {
      employee.is_consent_given = true;
    }

    if (!employee.organizations) {
      employee.organizations = [];
    }

    employee.organizations.push(inviteToken.organization);
    await this.employeeRepository.save(employee);

    inviteToken.is_used = true;
    inviteToken.used_at = new Date();
    inviteToken.used_by_employee = employee;
    await this.inviteTokenRepository.save(inviteToken);

    return {
      organization_id: inviteToken.organization.organization_id,
    };
  }

  async updateProfilePhoto(
    employeeId: number,
    photo: Express.Multer.File,
  ): Promise<UpdateProfilePhotoResponseDto> {
    this.fileValidator.validateImageFile(photo);

    const employee = await this.employeeRepository.findOne({
      where: { employee_id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    if (employee.photo) {
      await this.fileService.deleteFile(employee.photo);
    }

    employee.photo = photo.path;
    await this.employeeRepository.save(employee);

    return { photo: employee.photo };
  }

  async updateProfileInfo(
    employeeId: number,
    updateInfoDto: UpdateProfileInfoDto,
  ): Promise<UpdateProfileInfoResponseDto> {
    const employee = await this.employeeRepository.findOne({
      where: { employee_id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    employee.full_name = updateInfoDto.name;
    if (updateInfoDto.phone_number !== undefined) {
      employee.phone = updateInfoDto.phone_number;
    }
    await this.employeeRepository.save(employee);

    return {
      name: employee.full_name,
      phone_number: employee.phone,
    };
  }

  async getOrganizations(
    employeeId: number,
    offset: number,
    limit: number,
    search?: string,
  ) {
    const employee = await this.employeeRepository.findOne({
      where: { employee_id: employeeId },
      relations: ['organizations'],
    });

    if (!employee) {
      throw new NotFoundException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    if (!employee.organizations || employee.organizations.length === 0) {
      return { organizations: [], total: 0 };
    }

    let organizations = employee.organizations;

    if (search) {
      organizations = organizations.filter((org) =>
        org.title.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const total = organizations.length;
    const paginatedOrganizations = organizations.slice(offset, offset + limit);

    return { organizations: paginatedOrganizations, total };
  }

  async getOrganizationInfo(employeeId: number, organizationId: number) {
    const employee = await this.employeeRepository.findOne({
      where: { employee_id: employeeId },
      relations: ['organizations'],
    });

    if (!employee) {
      throw new NotFoundException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    const organization = employee.organizations?.find(
      (org) => org.organization_id === organizationId,
    );

    if (!organization) {
      throw new NotFoundException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.ORGANIZATION_NOT_FOUND,
      );
    }

    return organization;
  }

  async getProfile(employeeId: number) {
    const employee = await this.employeeRepository.findOne({
      where: { employee_id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    return {
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      photo: employee.photo,
    };
  }

  async getOrganizationMembers(
    employeeId: number,
    organizationId: number,
    search?: string,
    offset: number = 0,
    limit: number = 20,
  ) {
    const employeeOrgCheck = await this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoin('employee.organizations', 'org')
      .where('employee.employee_id = :employeeId', { employeeId })
      .andWhere('org.organization_id = :organizationId', { organizationId })
      .getOne();

    if (!employeeOrgCheck) {
      throw new NotFoundException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_IN_ORGANIZATION,
      );
    }

    const dataSource = this.employeeRepository.manager.connection;

    const orgAdmins = dataSource
      .createQueryBuilder()
      .from('organization_admin', 'org_admin')
      .leftJoin(
        'organization',
        'org',
        'org.organization_admin_id = org_admin.organization_admin_id',
      )
      .where('org.organization_id = :organizationId', {
        organizationId,
      })
      .andWhere(
        search ? 'org_admin.full_name ILIKE :search' : '1=1',
        search ? { search: `%${search}%` } : {},
      )
      .select('org_admin.organization_admin_id', 'id')
      .addSelect('org_admin.full_name', 'full_name')
      .addSelect('org_admin.email', 'email')
      .addSelect('org_admin.photo', 'photo')
      .addSelect("'organization_admin'", 'role')
      .addSelect('org_admin.created_at', 'created_at')
      .addSelect('1', 'sort_order')
      .addSelect('ARRAY[]::integer[]', 'position_ids');

    const tagAdmins = dataSource
      .createQueryBuilder()
      .from('tag_admin', 'tag_admin')
      .where('tag_admin.organization_id = :organizationId', { organizationId })
      .andWhere(
        search ? 'tag_admin.full_name ILIKE :search' : '1=1',
        search ? { search: `%${search}%` } : {},
      )
      .select('tag_admin.tag_admin_id', 'id')
      .addSelect('tag_admin.full_name', 'full_name')
      .addSelect('tag_admin.email', 'email')
      .addSelect('tag_admin.photo', 'photo')
      .addSelect("'tag_admin'", 'role')
      .addSelect('tag_admin.created_at', 'created_at')
      .addSelect('2', 'sort_order')
      .addSelect('ARRAY[]::integer[]', 'position_ids');

    const employees = dataSource
      .createQueryBuilder()
      .from('employee', 'employee')
      .leftJoin(
        'employee_organizations_organization',
        'emp_org',
        'emp_org.employeeEmployeeId = employee.employee_id',
      )
      .leftJoin(
        'employee_positions_position',
        'emp_pos',
        'emp_pos.employeeEmployeeId = employee.employee_id',
      )
      .where('emp_org.organizationOrganizationId = :organizationId', {
        organizationId,
      })
      .andWhere(
        search ? 'employee.full_name ILIKE :search' : '1=1',
        search ? { search: `%${search}%` } : {},
      )
      .select('employee.employee_id', 'id')
      .addSelect('employee.full_name', 'full_name')
      .addSelect('employee.email', 'email')
      .addSelect('employee.photo', 'photo')
      .addSelect("'employee'", 'role')
      .addSelect('employee.created_at', 'created_at')
      .addSelect('3', 'sort_order')
      .addSelect(
        'ARRAY_AGG(DISTINCT emp_pos.positionPositionId)',
        'position_ids',
      )
      .groupBy('employee.employee_id');

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

  async deleteProfile(employeeId: number): Promise<void> {
    const employee = await this.employeeRepository.findOne({
      where: { employee_id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    await this.employeeRepository.remove(employee);
  }

  async leaveOrganization(
    employeeId: number,
    organizationId: number,
  ): Promise<void> {
    const employee = await this.employeeRepository.findOne({
      where: { employee_id: employeeId },
      relations: ['organizations'],
    });

    if (!employee) {
      throw new NotFoundException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    const belongsToOrganization = employee.organizations?.some(
      (org) => org.organization_id === organizationId,
    );

    if (!belongsToOrganization) {
      throw new BadRequestException(
        EMPLOYEES_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_IN_ORGANIZATION,
      );
    }

    employee.organizations = employee.organizations.filter(
      (org) => org.organization_id !== organizationId,
    );

    await this.employeeRepository.save(employee);
  }
}
