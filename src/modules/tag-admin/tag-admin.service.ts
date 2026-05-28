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
import { AssignTagToEmployeeDto } from './dto/assign-tag-to-employee.dto';
import { EmployeeWithTagListItemDto } from './dto/employee-with-tag-list-item.dto';
import { UpdateProfileInfoDto } from '../../shared/dto/update-profile-info.dto';
import { UpdateProfilePhotoResponseDto } from '../../shared/dto/update-profile-photo-response.dto';
import { UpdateProfileInfoResponseDto } from '../../shared/dto/update-profile-info-response.dto';
import { basename } from 'path';
import { FileValidator } from '../../shared/validators/file.validator';
import { FileService } from '../../shared/services/file.service';
import { FILE_VALIDATION_CONSTANTS } from '../../shared/constants/file-validation.constants';
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

  private mapProfilePhotoToPublicUrl(
    photoPath: string | null,
    requestOrigin?: string,
  ): string | null {
    if (!photoPath) return null;
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      return photoPath;
    }

    const uploadsPrefix = FILE_VALIDATION_CONSTANTS.UPLOADS_URL_PREFIX.replace(
      /\/$/,
      '',
    );
    const normalizedPath = photoPath.replace(/\\/g, '/');
    const uploadsIndex = normalizedPath.lastIndexOf('/uploads/');

    const publicPath =
      uploadsIndex >= 0
        ? normalizedPath.slice(uploadsIndex)
        : `${uploadsPrefix}/${basename(normalizedPath)}`;

    return requestOrigin
      ? `${requestOrigin.replace(/\/$/, '')}${publicPath}`
      : publicPath;
  }

  async updateProfilePhoto(
    tagAdminId: number,
    photo: Express.Multer.File,
    requestOrigin?: string,
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

    return {
      photo: this.mapProfilePhotoToPublicUrl(tagAdmin.photo, requestOrigin)!,
    };
  }

  async updateProfileInfo(
    tagAdminId: number,
    updateInfoDto: UpdateProfileInfoDto,
  ): Promise<UpdateProfileInfoResponseDto> {
    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { tag_admin_id: tagAdminId },
      relations: ['organization'],
    });

    if (!tagAdmin) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    tagAdmin.full_name = updateInfoDto.name;
    if (updateInfoDto.phone !== undefined) {
      tagAdmin.phone = updateInfoDto.phone;
    }
    await this.tagAdminRepository.save(tagAdmin);

    return {
      name: tagAdmin.full_name,
      phone: tagAdmin.phone,
    };
  }

  async getProfile(tagAdminId: number, requestOrigin?: string) {
    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { tag_admin_id: tagAdminId },
      relations: ['organization'],
    });

    if (!tagAdmin || !tagAdmin.organization) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    return {
      tag_admin_id: tagAdmin.tag_admin_id,
      organization_id: tagAdmin.organization.organization_id,
      full_name: tagAdmin.full_name,
      email: tagAdmin.email,
      phone: tagAdmin.phone,
      photo: this.mapProfilePhotoToPublicUrl(tagAdmin.photo, requestOrigin),
    };
  }

  async getOrganization(tagAdminId: number) {
    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { tag_admin_id: tagAdminId },
      relations: ['organization'],
    });

    if (!tagAdmin || !tagAdmin.organization) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    return {
      organization_id: tagAdmin.organization.organization_id,
      title: tagAdmin.organization.title,
      description: tagAdmin.organization.description,
      created_at: tagAdmin.organization.created_at,
    };
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
    });

    if (!employee) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
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
    requestOrigin?: string,
  ): Promise<{
    items: EmployeeWithTagListItemDto[];
    total: number;
    offset: number;
    limit: number;
  }> {
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

    const latestAssignment = this.dataSource
      .createQueryBuilder()
      .select('ta.employee_id', 'employee_id')
      .addSelect('MAX(ta.tag_assignment_id)', 'latest_tag_assignment_id')
      .from('tag_assignment', 'ta')
      .innerJoin('rfid_tag', 'sub_tag', 'sub_tag.rfid_tag_id = ta.rfid_tag_id')
      .where('sub_tag.organization_id = :organizationId', { organizationId })
      .groupBy('ta.employee_id');

    const employeesQuery = this.dataSource
      .createQueryBuilder(Employee, 'employee')
      .leftJoin('employee.organizations', 'emp_org')
      .leftJoin(
        `(${latestAssignment.getQuery()})`,
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
      .addSelect('employee.phone', 'phone')
      .addSelect(
        `CASE WHEN rfid_tag.organization_id = :organizationId THEN true ELSE false END`,
        'has_assigned_tag',
      )
      .addSelect('employee.created_at', 'created_at')
      .setParameters(latestAssignment.getParameters())
      .orderBy('employee.created_at', 'DESC')
      .offset(offset)
      .limit(limit);

    type EmployeeWithTagRaw = {
      id: number;
      full_name: string;
      email: string;
      photo: string | null;
      phone: string | null;
      has_assigned_tag: boolean;
      created_at: Date;
    };

    const [items, total] = await Promise.all([
      employeesQuery.getRawMany<EmployeeWithTagRaw>(),
      employeesQuery.clone().offset(undefined).limit(undefined).getCount(),
    ]);

    return {
      items: items.map(
        (result): EmployeeWithTagListItemDto => ({
          id: result.id,
          full_name: result.full_name,
          email: result.email,
          photo: this.mapProfilePhotoToPublicUrl(result.photo, requestOrigin),
          phone: result.phone,
          has_assigned_tag: Boolean(result.has_assigned_tag),
          created_at: result.created_at,
        }),
      ),
      total,
      offset,
      limit,
    };
  }

  async getAssignedTagForEmployee(
    tagAdminId: number,
    employeeId: number,
  ): Promise<RfidTag | null> {
    const organizationId = await this.getTagAdminOrganizationId(tagAdminId);
    await this.validateEmployeeInOrganization(employeeId, organizationId);

    return this.rfidTagRepository
      .createQueryBuilder('tag')
      .innerJoin('tag.tag_assignments', 'assignment')
      .where('assignment.employee_id = :employeeId', { employeeId })
      .andWhere('tag.organization_id = :organizationId', { organizationId })
      .orderBy('assignment.tag_assignment_id', 'DESC')
      .getOne();
  }

  async getAvailableTagsForEmployee(
    tagAdminId: number,
    employeeId: number,
    offset: number = 0,
    limit: number = 20,
    search?: string,
  ) {
    const organizationId = await this.getTagAdminOrganizationId(tagAdminId);
    await this.validateEmployeeInOrganization(employeeId, organizationId);

    const assignedTagIdsQuery = this.rfidTagRepository
      .createQueryBuilder('assigned_tag')
      .innerJoin('assigned_tag.tag_assignments', 'assignment')
      .select('assigned_tag.rfid_tag_id')
      .where('assigned_tag.organization_id = :organizationId', {
        organizationId,
      })
      .andWhere('assignment.rfid_tag_id IS NOT NULL');

    const query = this.rfidTagRepository
      .createQueryBuilder('tag')
      .where('tag.organization_id = :organizationId', { organizationId })
      .andWhere(`tag.rfid_tag_id NOT IN (${assignedTagIdsQuery.getQuery()})`)
      .setParameters(assignedTagIdsQuery.getParameters());

    if (search) {
      query.andWhere('tag.name ILIKE :search', { search: `%${search}%` });
    }

    const [items, total] = await query
      .orderBy('tag.created_at', 'DESC')
      .offset(offset)
      .limit(limit)
      .getManyAndCount();

    return { items, total, offset, limit, employee_id: employeeId };
  }

  private async getTagAdminOrganizationId(tagAdminId: number): Promise<number> {
    const tagAdmin = await this.tagAdminRepository.findOne({
      where: { tag_admin_id: tagAdminId },
      relations: ['organization'],
    });

    if (!tagAdmin || !tagAdmin.organization) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.TAG_ADMIN_NOT_FOUND,
      );
    }

    return tagAdmin.organization.organization_id;
  }

  private async validateEmployeeInOrganization(
    employeeId: number,
    organizationId: number,
  ): Promise<void> {
    const employee = await this.employeeRepository
      .createQueryBuilder('employee')
      .innerJoin('employee.organizations', 'organization')
      .where('employee.employee_id = :employeeId', { employeeId })
      .andWhere('organization.organization_id = :organizationId', {
        organizationId,
      })
      .getOne();

    if (!employee) {
      throw new NotFoundException(
        TAG_ADMIN_CONSTANTS.ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
      );
    }
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
