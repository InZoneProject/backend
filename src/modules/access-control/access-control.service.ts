import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ZoneAccessRule } from './entities/zone-access-rule.entity';
import { ZoneRuleAssignment } from './entities/zone-rule-assignment.entity';
import { Zone } from '../buildings/entities/zone.entity';
import { Position } from '../organizations/entities/position.entity';
import { CreateZoneAccessRuleDto } from './dto/create-zone-access-rule.dto';
import { UpdateZoneAccessRuleDto } from './dto/update-zone-access-rule.dto';
import { AttachRuleToZoneDto } from './dto/attach-rule-to-zone.dto';
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

    const rule = this.zoneAccessRuleRepository.create({
      title: createDto.title,
      access_type: createDto.access_type,
      max_duration_minutes: createDto.max_duration_minutes || null,
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

  async getZoneAccessRules(userId: number, zoneId: number) {
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

    const assignments = await this.zoneRuleAssignmentRepository.find({
      where: { zone: { zone_id: zoneId } },
      relations: ['zone_access_rule', 'positions'],
    });

    return assignments.map((assignment) => ({
      zone_access_rule_id: assignment.zone_access_rule.zone_access_rule_id,
      title: assignment.zone_access_rule.title,
      access_type: assignment.zone_access_rule.access_type,
      max_duration_minutes: assignment.zone_access_rule.max_duration_minutes,
      positions:
        assignment.positions?.map((p) => ({
          position_id: p.position_id,
          role: p.role,
        })) || [],
      created_at: assignment.created_at,
    }));
  }

  async attachRuleToZone(
    userId: number,
    ruleId: number,
    zoneId: number,
    attachDto: AttachRuleToZoneDto,
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

    const positions = await this.positionRepository.find({
      where: { position_id: In(attachDto.position_ids) },
      relations: ['organization'],
    });

    if (positions.length !== attachDto.position_ids.length) {
      throw new NotFoundException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.POSITION_NOT_FOUND,
      );
    }

    const allInOrganization = positions.every(
      (p) =>
        p.organization.organization_id ===
        zone.building.organization.organization_id,
    );

    if (!allInOrganization) {
      throw new BadRequestException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.POSITIONS_NOT_IN_ORGANIZATION,
      );
    }

    const assignment = this.zoneRuleAssignmentRepository.create({
      zone,
      zone_access_rule: rule,
      positions,
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

    if (assignment.positions.length === 1) {
      throw new BadRequestException(
        ACCESS_CONTROL_CONSTANTS.ERROR_MESSAGES.CANNOT_REMOVE_LAST_POSITION,
      );
    }

    assignment.positions = assignment.positions.filter(
      (p) => p.position_id !== positionId,
    );

    await this.zoneRuleAssignmentRepository.save(assignment);
  }

  async getAllRules(
    userId: number,
    organizationId: number,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ) {
    await this.organizationOwnershipValidator.validateOwnership(
      userId,
      organizationId,
    );

    const rules = await this.zoneAccessRuleRepository.find({
      where: {
        organization: { organization_id: organizationId },
      },
      skip: offset,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    });

    return await Promise.all(
      rules.map(async (rule) => {
        const assignments = await this.zoneRuleAssignmentRepository.find({
          where: {
            zone_access_rule: { zone_access_rule_id: rule.zone_access_rule_id },
          },
          relations: ['zone', 'positions'],
        });

        const zones = assignments.map((assignment) => ({
          zone_id: assignment.zone.zone_id,
          title: assignment.zone.title,
          positions:
            assignment.positions?.map((p) => ({
              position_id: p.position_id,
              role: p.role,
            })) || [],
        }));

        return {
          zone_access_rule_id: rule.zone_access_rule_id,
          title: rule.title,
          access_type: rule.access_type,
          max_duration_minutes: rule.max_duration_minutes,
          zones,
          created_at: rule.created_at,
        };
      }),
    );
  }
}
