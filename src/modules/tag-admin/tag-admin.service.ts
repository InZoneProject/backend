import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TagAdmin } from './entities/tag-admin.entity';
import { TagAssignment } from './entities/tag-assignment.entity';
import { Employee } from '../employees/entities/employee.entity';
import { RfidTag } from '../rfid/entities/rfid-tag.entity';
import { OrganizationAdmin } from '../organizations/entities/organization-admin.entity';
import { Position } from '../organizations/entities/position.entity';
import { AssignTagToEmployeeDto } from './dto/assign-tag-to-employee.dto';
import { EmployeeWithTagListItemDto } from './dto/employee-with-tag-list-item.dto';
import { UpdateProfileInfoDto } from '../../shared/dto/update-profile-info.dto';
import { UpdateProfilePhotoResponseDto } from '../../shared/dto/update-profile-photo-response.dto';
import { UpdateProfileInfoResponseDto } from '../../shared/dto/update-profile-info-response.dto';
import { OrganizationMemberRole } from '../../shared/enums/organization-member-role.enum';
import { FileValidator } from '../../shared/validators/file.validator';
import { FileService } from '../../shared/services/file.service';
import { TAG_ADMIN_CONSTANTS } from './tag-admin.constants';

@Injectable()
export class TagAdminService {
  constructor(
    @InjectRepository(TagAdmin)
    private readonly tagAdminRepository: Repository<TagAdmin>,
    @InjectRepository(TagAssignment)
    private readonly tagAssignmentRepository: Repository<TagAssignment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(RfidTag)
    private readonly rfidTagRepository: Repository<RfidTag>,
    private readonly fileValidator: FileValidator,
    private readonly fileService: FileService,
    private readonly dataSource: DataSource,
  ) {}

  async updateProfilePhoto(
    tagAdminId: number,
    photo: Express.Multer.File,
  ): Promise<UpdateProfilePhotoResponseDto> {
    this.fileValidator.validateImageFile(photo);

    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { tag_admin_id: tagAdminId },
    });

    if (!tagAdmin) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    if (tagAdmin.photo) {
      await this.fileService.deleteFile(tagAdmin.photo);
    }

    tagAdmin.photo = photo.path;
    await this.tagAdminRepository.save(tagAdmin);

    return { photo: tagAdmin.photo };
  }

  async updateProfileInfo(
    tagAdminId: number,
    updateInfoDto: UpdateProfileInfoDto,
  ): Promise<UpdateProfileInfoResponseDto> {
    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { tag_admin_id: tagAdminId },
    });

    if (!tagAdmin) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    tagAdmin.full_name = updateInfoDto.name;
    if (updateInfoDto.phone_number !== undefined) {
      tagAdmin.phone = updateInfoDto.phone_number;
    }
    await this.tagAdminRepository.save(tagAdmin);

    return {
      name: tagAdmin.full_name,
      phone_number: tagAdmin.phone,
    };
  }

  async getProfile(tagAdminId: number) {
    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { tag_admin_id: tagAdminId },
    });

    if (!tagAdmin) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    return {
      tag_admin_id: tagAdmin.tag_admin_id,
      full_name: tagAdmin.full_name,
      email: tagAdmin.email,
      phone: tagAdmin.phone,
      photo: tagAdmin.photo,
    };
  }

  async getOrganizationInfo(tagAdminId: number) {
    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { tag_admin_id: tagAdminId },
      relations: ['organization'],
    });

    if (!tagAdmin) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    if (!tagAdmin.organization) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.ORGANIZATION_NOT_FOUND,
      );
    }

    return tagAdmin.organization;
  }

  async assignTagToEmployee(
    tagAdminId: number,
    assignTagDto: AssignTagToEmployeeDto,
  ): Promise<void> {
    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { tag_admin_id: tagAdminId },
      relations: ['organization'],
    });

    if (!tagAdmin || !tagAdmin.organization) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    const organizationId = tagAdmin.organization.organization_id;

    const employeeOrgCheck = await this.dataSource
      .createQueryBuilder()
      .select('1', 'exists')
      .from('employee_organizations_organization', 'emp_org')
      .where('emp_org.employeeEmployeeId = :employeeId', {
        employeeId: assignTagDto.employee_id,
      })
      .andWhere('emp_org.organizationOrganizationId = :organizationId', {
        organizationId,
      })
      .getRawOne<{ exists: string }>();

    if (!employeeOrgCheck) {
      throw new BadRequestException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_IN_TAG_ADMIN_ORGANIZATION,
      );
    }

    const employee = await this.employeeRepository.findOne({
      where: { employee_id: assignTagDto.employee_id },
      relations: ['positions'],
    });

    if (!employee) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    if (!employee.positions || employee.positions.length === 0) {
      throw new BadRequestException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_HAS_NO_POSITION,
      );
    }

    const rfidTag = await this.rfidTagRepository.findOne({
      where: { rfid_tag_id: assignTagDto.rfid_tag_id },
      relations: ['organization'],
    });

    if (!rfidTag) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.RFID_TAG_NOT_FOUND,
      );
    }

    if (rfidTag.organization.organization_id !== organizationId) {
      throw new BadRequestException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ORGANIZATION_MISMATCH,
      );
    }

    const existingTagAssignment = await this.tagAssignmentRepository
      .createQueryBuilder('ta')
      .where('ta.rfid_tag_id = :rfidTagId', {
        rfidTagId: assignTagDto.rfid_tag_id,
      })
      .leftJoinAndSelect('ta.employee', 'employee')
      .getOne();

    if (existingTagAssignment) {
      if (
        existingTagAssignment.employee?.employee_id === assignTagDto.employee_id
      ) {
        throw new ConflictException(
          TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_ALREADY_HAS_THIS_TAG,
        );
      }
      throw new ConflictException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ALREADY_ASSIGNED,
      );
    }

    const employeeHasTagInOrg = await this.tagAssignmentRepository
      .createQueryBuilder('ta')
      .innerJoin('ta.rfid_tag', 'rfid_tag')
      .where('ta.employee_id = :employeeId', {
        employeeId: assignTagDto.employee_id,
      })
      .andWhere('rfid_tag.organization_id = :organizationId', {
        organizationId,
      })
      .getOne();

    if (employeeHasTagInOrg) {
      throw new ConflictException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_ALREADY_HAS_TAG_IN_ORGANIZATION,
      );
    }

    const newAssignment = this.tagAssignmentRepository.create({
      employee: { employee_id: assignTagDto.employee_id },
      rfid_tag: { rfid_tag_id: assignTagDto.rfid_tag_id },
      tag_admin: { tag_admin_id: tagAdminId },
      tag_assignment_change_date_and_time: new Date(),
    });

    await this.tagAssignmentRepository.save(newAssignment);
  }

  async removeTagFromEmployee(
    tagAdminId: number,
    employeeId: number,
  ): Promise<void> {
    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { tag_admin_id: tagAdminId },
      relations: ['organization'],
    });

    if (!tagAdmin || !tagAdmin.organization) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    const organizationId = tagAdmin.organization.organization_id;

    const employeeOrgCheck = await this.dataSource
      .createQueryBuilder()
      .select('1', 'exists')
      .from('employee_organizations_organization', 'emp_org')
      .where('emp_org.employeeEmployeeId = :employeeId', { employeeId })
      .andWhere('emp_org.organizationOrganizationId = :organizationId', {
        organizationId,
      })
      .getRawOne<{ exists: string }>();

    if (!employeeOrgCheck) {
      throw new BadRequestException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_IN_TAG_ADMIN_ORGANIZATION,
      );
    }

    const employee = await this.employeeRepository.findOne({
      where: { employee_id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }

    const tagAssignment = await this.tagAssignmentRepository
      .createQueryBuilder('ta')
      .innerJoin('ta.rfid_tag', 'rfid_tag')
      .where('ta.employee_id = :employeeId', { employeeId })
      .andWhere('rfid_tag.organization_id = :organizationId', {
        organizationId,
      })
      .getOne();

    if (!tagAssignment) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_HAS_NO_ACTIVE_TAG,
      );
    }

    tagAssignment.tag_assignment_change_date_and_time = new Date();
    tagAssignment.rfid_tag = null;
    await this.tagAssignmentRepository.save(tagAssignment);
  }

  async getEmployeesWithTags(
    tagAdminId: number,
    search?: string,
    offset: number = 0,
    limit: number = 20,
  ): Promise<EmployeeWithTagListItemDto[]> {
    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { tag_admin_id: tagAdminId },
      relations: ['organization'],
    });

    if (!tagAdmin || !tagAdmin.organization) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    const organizationId = tagAdmin.organization.organization_id;

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
      .addSelect('NULL', 'rfid_tag_id')
      .addSelect('org_admin.created_at', 'created_at')
      .addSelect('1', 'sort_order');

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
      .addSelect('NULL', 'rfid_tag_id')
      .addSelect('tag_admin.created_at', 'created_at')
      .addSelect('2', 'sort_order');

    const employees = this.dataSource
      .createQueryBuilder(Employee, 'employee')
      .leftJoin('employee.organizations', 'emp_org')
      .leftJoin('employee.positions', 'emp_pos')
      .leftJoin(
        (subQuery) => {
          return subQuery
            .select('ta.employee_id', 'employee_id')
            .addSelect('MAX(ta.tag_assignment_id)', 'latest_tag_assignment_id')
            .from('tag_assignment', 'ta')
            .groupBy('ta.employee_id');
        },
        'latest_ta',
        'latest_ta.employee_id = employee.employee_id',
      )
      .leftJoin(
        'tag_assignment',
        'ta',
        'ta.tag_assignment_id = latest_ta.latest_tag_assignment_id',
      )
      .leftJoin('rfid_tag', 'rfid_tag', 'rfid_tag.rfid_tag_id = ta.rfid_tag_id')
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
      .addSelect(
        `CASE WHEN rfid_tag.organization_id = :organizationId THEN rfid_tag.rfid_tag_id ELSE NULL END`,
        'rfid_tag_id',
      )
      .addSelect('employee.created_at', 'created_at')
      .addSelect('3', 'sort_order')
      .addSelect('ARRAY_AGG(DISTINCT emp_pos.position_id)', 'position_ids')
      .groupBy('employee.employee_id')
      .addGroupBy('employee.full_name')
      .addGroupBy('employee.email')
      .addGroupBy('employee.photo')
      .addGroupBy('employee.created_at')
      .addGroupBy('rfid_tag.rfid_tag_id')
      .addGroupBy('rfid_tag.organization_id');

    type EmployeeWithTagRaw = EmployeeWithTagListItemDto & {
      sort_order: number;
      position_ids?: number[] | null;
    };

    const orgAdminsResults = await orgAdmins.getRawMany<EmployeeWithTagRaw>();
    const tagAdminsResults = await tagAdmins.getRawMany<EmployeeWithTagRaw>();
    const employeesResults = await employees.getRawMany<EmployeeWithTagRaw>();

    const allResults: EmployeeWithTagRaw[] = [
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
        ? await this.dataSource.getRepository(Position).find({
            where: positionIds.map((id) => ({ position_id: id })),
            select: ['position_id', 'role', 'description', 'created_at'],
          })
        : [];

    return paginatedResults.map(
      (result): EmployeeWithTagListItemDto => ({
        id: result.id,
        full_name: result.full_name,
        email: result.email,
        photo: result.photo,
        role: result.role,
        ...(result.role === OrganizationMemberRole.EMPLOYEE && {
          rfid_tag_id: result.rfid_tag_id,
          positions:
            result.position_ids && result.position_ids[0] !== null
              ? positions.filter((p) =>
                  result.position_ids?.includes(p.position_id),
                )
              : [],
        }),
        created_at: result.created_at,
      }),
    );
  }

  async deleteProfile(tagAdminId: number): Promise<void> {
    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { tag_admin_id: tagAdminId },
    });

    if (!tagAdmin) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    await this.tagAdminRepository.remove(tagAdmin);
  }
}
