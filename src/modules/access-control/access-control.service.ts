import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZoneAccessRule } from './entities/zone-access-rule.entity';
import { ZoneRuleAssignment } from './entities/zone-rule-assignment.entity';
import { Zone } from '../buildings/entities/zone.entity';
import { Position } from '../organizations/entities/position.entity';
import { CreateZoneAccessRuleDto } from './dto/create-zone-access-rule.dto';
import { UpdateZoneAccessRuleDto } from './dto/update-zone-access-rule.dto';
import { AccessType } from '../../shared/enums/access-type.enum';
import { OrganizationOwnershipValidator } from '../../shared/validators/organization-ownership.validator';
import { ACCESS_CONTROL_CONSTANTS } from './access-control.constants';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';

@Injectable()
export class AccessControlService {
  constructor(
    @InjectRepository(ZoneAccessRule)
    private readonly zoneAccessRuleRepository: Repository<ZoneAccessRule>,
    @InjectRepository(ZoneRuleAssignment)
    private readonly zoneRuleAssignmentRepository: Repository<ZoneRuleAssignment>,
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    private readonly organizationOwnershipValidator: OrganizationOwnershipValidator,
  ) {}

  async createZoneAccessRule(
    userId: number,
    createDto: CreateZoneAccessRuleDto,
  ) {
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      createDto.organization_id,
    );

    if (
      createDto.access_type === AccessType.TIME_LIMITED &&
      !createDto.max_duration_minutes
    ) {
      throw new BadRequestException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.MAX_DURATION_REQUIRED,
      );
    }

    const maxDurationMinutes =
      createDto.access_type === AccessType.TIME_LIMITED
        ? createDto.max_duration_minutes || null
        : null;

    const rule = this.zoneAccessRuleRepository.create({
      title: createDto.title,
      access_type: createDto.access_type,
      max_duration_minutes: maxDurationMinutes,
      organization: { organization_id: createDto.organization_id },
    });

    const savedRule = await this.zoneAccessRuleRepository.save(rule);

    return {
      zone_access_rule_id: savedRule.zone_access_rule_id,
      title: savedRule.title,
      access_type: savedRule.access_type,
      max_duration_minutes: savedRule.max_duration_minutes,
      organization_id: createDto.organization_id,
      created_at: savedRule.created_at,
    };
  }

  async updateZoneAccessRule(
    userId: number,
    ruleId: number,
    updateDto: UpdateZoneAccessRuleDto,
  ) {
    const rule = await this.zoneAccessRuleRepository.findOne({
      where: { zone_access_rule_id: ruleId },
      relations: ['organization'],
    });

    if (!rule) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_ACCESS_RULE_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      rule.organization.organization_id,
    );

    if (updateDto.title !== undefined) {
      rule.title = updateDto.title;
    }

    if (updateDto.access_type !== undefined) {
      rule.access_type = updateDto.access_type;
    }

    if (updateDto.max_duration_minutes !== undefined) {
      rule.max_duration_minutes = updateDto.max_duration_minutes;
    }

    if (rule.access_type !== AccessType.TIME_LIMITED) {
      rule.max_duration_minutes = null;
    }

    if (
      rule.access_type === AccessType.TIME_LIMITED &&
      !rule.max_duration_minutes
    ) {
      throw new BadRequestException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.MAX_DURATION_REQUIRED,
      );
    }

    const savedRule = await this.zoneAccessRuleRepository.save(rule);

    return {
      zone_access_rule_id: savedRule.zone_access_rule_id,
      title: savedRule.title,
      access_type: savedRule.access_type,
      max_duration_minutes: savedRule.max_duration_minutes,
      organization_id: savedRule.organization.organization_id,
      created_at: savedRule.created_at,
    };
  }

  async deleteZoneAccessRule(userId: number, ruleId: number): Promise<void> {
    const rule = await this.zoneAccessRuleRepository.findOne({
      where: { zone_access_rule_id: ruleId },
      relations: ['organization'],
    });

    if (!rule) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_ACCESS_RULE_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      rule.organization.organization_id,
    );

    await this.zoneAccessRuleRepository.remove(rule);
  }

  async getZoneAccessRules(
    userId: number,
    zoneId: number,
    search?: string,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ) {
    const zone = await this.zoneRepository.findOne({
      where: { zone_id: zoneId },
      relations: ['building', 'building.organization'],
    });

    if (!zone) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    const assignmentsQuery = this.zoneRuleAssignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.zone_access_rule', 'zone_access_rule')
      .leftJoinAndSelect('assignment.positions', 'positions')
      .where('assignment.zone_id = :zoneId', { zoneId })
      .orderBy('assignment.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    if (search) {
      assignmentsQuery.andWhere('zone_access_rule.title ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [assignments, total] = await assignmentsQuery.getManyAndCount();

    return {
      items: assignments.map((assignment) => ({
        zone_access_rule_id: assignment.zone_access_rule.zone_access_rule_id,
        title: assignment.zone_access_rule.title,
        access_type: assignment.zone_access_rule.access_type,
        max_duration_minutes: assignment.zone_access_rule.max_duration_minutes,
        has_positions: (assignment.positions || []).length > 0,
        created_at: assignment.created_at,
      })),
      total,
      offset,
      limit,
    };
  }

  async getZoneUnassignedAccessRules(
    userId: number,
    zoneId: number,
    search?: string,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ) {
    const zone = await this.zoneRepository.findOne({
      where: { zone_id: zoneId },
      relations: ['building', 'building.organization'],
    });

    if (!zone) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_NOT_FOUND,
      );
    }

    const organizationId = zone.building.organization.organization_id;
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      organizationId,
    );

    const assignedRuleIdsQuery = this.zoneRuleAssignmentRepository
      .createQueryBuilder('assignment')
      .select('assignment.zone_access_rule_id')
      .where('assignment.zone_id = :zoneId', { zoneId });

    const rulesQuery = this.zoneAccessRuleRepository
      .createQueryBuilder('rule')
      .where('rule.organization_id = :organizationId', { organizationId })
      .andWhere(
        `rule.zone_access_rule_id NOT IN (${assignedRuleIdsQuery.getQuery()})`,
      )
      .setParameters(assignedRuleIdsQuery.getParameters())
      .orderBy('rule.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    if (search) {
      rulesQuery.andWhere('rule.title ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await rulesQuery.getManyAndCount();

    return {
      items,
      total,
      offset,
      limit,
    };
  }

  async attachRuleToZone(
    userId: number,
    ruleId: number,
    zoneId: number,
  ): Promise<void> {
    const [rule, zone] = await Promise.all([
      this.zoneAccessRuleRepository.findOne({
        where: { zone_access_rule_id: ruleId },
        relations: ['organization'],
      }),
      this.zoneRepository.findOne({
        where: { zone_id: zoneId },
        relations: ['building', 'building.organization'],
      }),
    ]);

    if (!rule) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_ACCESS_RULE_NOT_FOUND,
      );
    }

    if (!zone) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    if (
      rule.organization.organization_id !==
      zone.building.organization.organization_id
    ) {
      throw new ConflictException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.CROSS_ORG_ATTACHMENT,
      );
    }

    const existingAssignment = await this.zoneRuleAssignmentRepository.findOne({
      where: {
        zone: { zone_id: zoneId },
        zone_access_rule: { zone_access_rule_id: ruleId },
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_ACCESS_RULE_ALREADY_EXISTS,
      );
    }

    const assignment = this.zoneRuleAssignmentRepository.create({
      zone,
      zone_access_rule: rule,
      positions: [],
    });

    await this.zoneRuleAssignmentRepository.save(assignment);
  }

  async detachRuleFromZone(
    userId: number,
    ruleId: number,
    zoneId: number,
  ): Promise<void> {
    const zone = await this.zoneRepository.findOne({
      where: { zone_id: zoneId },
      relations: ['building', 'building.organization'],
    });

    if (!zone) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    const assignment = await this.zoneRuleAssignmentRepository.findOne({
      where: {
        zone: { zone_id: zoneId },
        zone_access_rule: { zone_access_rule_id: ruleId },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_ACCESS_RULE_NOT_FOUND,
      );
    }

    await this.zoneRuleAssignmentRepository.remove(assignment);
  }

  async attachPositionToZoneRule(
    userId: number,
    zoneId: number,
    ruleId: number,
    positionId: number,
  ): Promise<void> {
    const [zone, position] = await Promise.all([
      this.zoneRepository.findOne({
        where: { zone_id: zoneId },
        relations: ['building', 'building.organization'],
      }),
      this.positionRepository.findOne({
        where: { position_id: positionId },
        relations: ['organization'],
      }),
    ]);

    if (!zone) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_NOT_FOUND,
      );
    }

    if (!position) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.POSITION_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    if (
      position.organization.organization_id !==
      zone.building.organization.organization_id
    ) {
      throw new BadRequestException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.POSITIONS_NOT_IN_ORGANIZATION,
      );
    }

    const assignment = await this.zoneRuleAssignmentRepository.findOne({
      where: {
        zone: { zone_id: zoneId },
        zone_access_rule: { zone_access_rule_id: ruleId },
      },
      relations: ['positions'],
    });

    if (!assignment) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_ACCESS_RULE_NOT_FOUND,
      );
    }

    const alreadyAttached = assignment.positions?.some(
      (p) => p.position_id === positionId,
    );

    if (alreadyAttached) {
      throw new ConflictException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.POSITION_ALREADY_ATTACHED,
      );
    }

    if (!assignment.positions) assignment.positions = [];
    assignment.positions.push(position);

    await this.zoneRuleAssignmentRepository.save(assignment);
  }

  async detachPositionFromZoneRule(
    userId: number,
    zoneId: number,
    ruleId: number,
    positionId: number,
  ): Promise<void> {
    const zone = await this.zoneRepository.findOne({
      where: { zone_id: zoneId },
      relations: ['building', 'building.organization'],
    });

    if (!zone) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    const assignment = await this.zoneRuleAssignmentRepository.findOne({
      where: {
        zone: { zone_id: zoneId },
        zone_access_rule: { zone_access_rule_id: ruleId },
      },
      relations: ['positions'],
    });

    if (!assignment) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_ACCESS_RULE_NOT_FOUND,
      );
    }

    const positionAttached = assignment.positions?.some(
      (p) => p.position_id === positionId,
    );

    if (!positionAttached) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.POSITION_NOT_ATTACHED_TO_RULE,
      );
    }

    assignment.positions = assignment.positions.filter(
      (p) => p.position_id !== positionId,
    );

    await this.zoneRuleAssignmentRepository.save(assignment);
  }

  async getRulePositions(
    userId: number,
    zoneId: number,
    ruleId: number,
    assigned: boolean,
    search?: string,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ) {
    const zone = await this.zoneRepository.findOne({
      where: { zone_id: zoneId },
      relations: ['building', 'building.organization'],
    });

    if (!zone) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_NOT_FOUND,
      );
    }

    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      zone.building.organization.organization_id,
    );

    const assignment = await this.zoneRuleAssignmentRepository.findOne({
      where: {
        zone: { zone_id: zoneId },
        zone_access_rule: { zone_access_rule_id: ruleId },
      },
      relations: ['positions'],
    });

    if (!assignment) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.ZONE_ACCESS_RULE_NOT_FOUND,
      );
    }

    const positionIds = (assignment.positions || []).map(
      (position) => position.position_id,
    );

    const positionsQuery = this.positionRepository
      .createQueryBuilder('position')
      .where('position.organization_id = :organizationId', {
        organizationId: zone.building.organization.organization_id,
      })
      .orderBy('position.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    if (positionIds.length > 0) {
      positionsQuery.andWhere(
        assigned
          ? 'position.position_id IN (:...positionIds)'
          : 'position.position_id NOT IN (:...positionIds)',
        { positionIds },
      );
    } else if (assigned) {
      positionsQuery.andWhere('1 = 0');
    }

    if (search) {
      positionsQuery.andWhere(
        '(position.role ILIKE :search OR position.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await positionsQuery.getManyAndCount();

    return { items, total, offset, limit };
  }
}
