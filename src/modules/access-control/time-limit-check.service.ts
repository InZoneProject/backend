import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZoneRuleAssignment } from './entities/zone-rule-assignment.entity';
import { AccessType } from '../../shared/enums/access-type.enum';
import { Employee } from '../employees/entities/employee.entity';
import { ScanEvent } from '../rfid/entities/scan-event.entity';
import { Door } from '../buildings/entities/door.entity';
import { Zone } from '../buildings/entities/zone.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../realtime/notifications.gateway';
import { TIME_LIMIT_CHECK_CONSTANTS } from './time-limit-check.constants';
import { NOTIFICATION_CONSTANTS } from '../notifications/notifications.constants';
import { determineNewZoneById } from '../../shared/utils/zone-navigation.util';

interface NotificationPayload {
  notification_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

interface CumulativeTimeResult {
  cumulativeTime: number;
  isCurrentlyInZone: boolean;
}

interface ActiveEmployee {
  id: number;
}

@Injectable()
export class TimeLimitCheckService {
  constructor(
    @InjectRepository(ZoneRuleAssignment)
    private readonly zoneRuleAssignmentRepository: Repository<ZoneRuleAssignment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(ScanEvent)
    private readonly scanEventRepository: Repository<ScanEvent>,
    @InjectRepository(Door)
    private readonly doorRepository: Repository<Door>,
    @InjectRepository(Zone)
    private readonly zoneRepository: Repository<Zone>,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkTimeLimits(): Promise<void> {
    const timeLimitedRules = await this.zoneRuleAssignmentRepository.find({
      where: { zone_access_rule: { access_type: AccessType.TIME_LIMITED } },
      relations: ['zone_access_rule', 'zone', 'positions'],
    });

    const zoneRulesMap = this.groupRulesByZone(timeLimitedRules);

    for (const [zoneId, rulesForZone] of zoneRulesMap) {
      await this.checkZoneViolations(zoneId, rulesForZone);
    }
  }

  private groupRulesByZone(
    rules: ZoneRuleAssignment[],
  ): Map<number, ZoneRuleAssignment[]> {
    const zoneRulesMap = new Map<number, ZoneRuleAssignment[]>();

    for (const rule of rules) {
      if (!rule.zone_access_rule.max_duration_minutes) {
        continue;
      }

      const zoneId = rule.zone.zone_id;
      if (!zoneRulesMap.has(zoneId)) {
        zoneRulesMap.set(zoneId, []);
      }
      const existingRules = zoneRulesMap.get(zoneId);
      if (existingRules) {
        existingRules.push(rule);
      }
    }

    return zoneRulesMap;
  }

  private async checkZoneViolations(
    zoneId: number,
    rulesForZone: ZoneRuleAssignment[],
  ): Promise<void> {
    const allPositionIds = this.collectPositionIds(rulesForZone);

    if (allPositionIds.size === 0) {
      return;
    }

    const startOfDay = this.getStartOfDay();
    const activeEmployeeIds = await this.getActiveEmployeeIds(startOfDay);

    if (activeEmployeeIds.length === 0) {
      return;
    }

    const employees = await this.employeeRepository
      .createQueryBuilder('employee')
      .innerJoin('employee.positions', 'position')
      .where('position.position_id IN (:...positionIds)', {
        positionIds: Array.from(allPositionIds),
      })
      .andWhere('employee.employee_id IN (:...activeIds)', {
        activeIds: activeEmployeeIds,
      })
      .leftJoinAndSelect('employee.positions', 'emp_positions')
      .distinct(true)
      .getMany();

    for (const employee of employees) {
      await this.processEmployeeViolation(
        employee,
        rulesForZone,
        zoneId,
        startOfDay,
      );
    }
  }

  private collectPositionIds(rulesForZone: ZoneRuleAssignment[]): Set<number> {
    const allPositionIds = new Set<number>();
    for (const rule of rulesForZone) {
      rule.positions.forEach((p) => allPositionIds.add(p.position_id));
    }
    return allPositionIds;
  }

  private getStartOfDay(): Date {
    const startOfDay = new Date();
    startOfDay.setHours(
      TIME_LIMIT_CHECK_CONSTANTS.TIME.DAY_START_HOUR,
      TIME_LIMIT_CHECK_CONSTANTS.TIME.DAY_START_MINUTE,
      TIME_LIMIT_CHECK_CONSTANTS.TIME.DAY_START_SECOND,
      TIME_LIMIT_CHECK_CONSTANTS.TIME.DAY_START_MILLISECOND,
    );
    return startOfDay;
  }

  private async getActiveEmployeeIds(startOfDay: Date): Promise<number[]> {
    const activeEmployees = await this.scanEventRepository
      .createQueryBuilder('scan')
      .leftJoin('scan.rfid_tag', 'tag')
      .leftJoin('tag.tag_assignments', 'assign')
      .select('assign.employee_id', 'id')
      .where('scan.created_at >= :startOfDay', { startOfDay })
      .andWhere('assign.employee_id IS NOT NULL')
      .distinct(true)
      .getRawMany<ActiveEmployee>();

    return activeEmployees.map((e) => e.id);
  }

  private async processEmployeeViolation(
    employee: Employee,
    rulesForZone: ZoneRuleAssignment[],
    zoneId: number,
    startOfDay: Date,
  ): Promise<void> {
    const effectiveLimit = this.getEffectiveTimeLimit(employee, rulesForZone);

    if (effectiveLimit === null) {
      return;
    }

    const lastNotification =
      await this.notificationsService.getLastNotification(
        employee.employee_id,
        zoneId,
      );

    const calculationStartTime = lastNotification
      ? lastNotification.created_at
      : startOfDay;

    const { cumulativeTime } = await this.calculateCumulativeTime(
      employee.employee_id,
      zoneId,
      calculationStartTime,
    );

    if (cumulativeTime >= effectiveLimit) {
      await this.createViolationNotification(employee, rulesForZone[0].zone);
    }
  }

  private getEffectiveTimeLimit(
    employee: Employee,
    timeLimitedRules: ZoneRuleAssignment[],
  ): number | null {
    const employeePositionIds = employee.positions.map((p) => p.position_id);
    const positionsWithRules = new Set<number>();
    const positionLimits = new Map<number, number>();

    for (const rule of timeLimitedRules) {
      const rulePositionIds = rule.positions.map((p) => p.position_id);
      for (const posId of rulePositionIds) {
        positionsWithRules.add(posId);
        const currentLimit =
          positionLimits.get(posId) ||
          TIME_LIMIT_CHECK_CONSTANTS.LIMITS.MIN_LIMIT;
        const newLimit =
          rule.zone_access_rule.max_duration_minutes ||
          TIME_LIMIT_CHECK_CONSTANTS.LIMITS.MIN_LIMIT;
        positionLimits.set(posId, Math.max(currentLimit, newLimit));
      }
    }

    for (const empPosId of employeePositionIds) {
      if (!positionsWithRules.has(empPosId)) {
        return null;
      }
    }

    let maxLimit: number = TIME_LIMIT_CHECK_CONSTANTS.LIMITS.MIN_LIMIT;
    for (const empPosId of employeePositionIds) {
      const limit = positionLimits.get(empPosId);
      if (limit !== undefined) {
        maxLimit = Math.max(maxLimit, limit);
      }
    }

    return maxLimit > TIME_LIMIT_CHECK_CONSTANTS.LIMITS.MIN_LIMIT
      ? maxLimit
      : null;
  }

  private async calculateCumulativeTime(
    employeeId: number,
    zoneId: number,
    countFrom: Date,
  ): Promise<CumulativeTimeResult> {
    const allScans = await this.scanEventRepository
      .createQueryBuilder('scan_event')
      .leftJoinAndSelect('scan_event.rfid_tag', 'rfid_tag')
      .leftJoinAndSelect('rfid_tag.tag_assignments', 'tag_assignment')
      .leftJoinAndSelect('scan_event.rfid_reader', 'rfid_reader')
      .where('tag_assignment.employee_id = :employeeId', { employeeId })
      .andWhere('scan_event.created_at >= CURRENT_DATE')
      .orderBy('scan_event.created_at', 'ASC')
      .getMany();

    let totalMinutes = TIME_LIMIT_CHECK_CONSTANTS.LIMITS.INITIAL_TOTAL_MINUTES;
    let currentZoneId: number | null = null;
    let lastEnterTime: Date | null = null;

    for (const scan of allScans) {
      if (!scan.rfid_reader) continue;

      const door = await this.doorRepository.findOne({
        where: {
          rfid_reader: { rfid_reader_id: scan.rfid_reader.rfid_reader_id },
        },
        relations: ['zone_from', 'zone_to'],
      });

      if (!door) continue;

      const newZoneId = determineNewZoneById(
        currentZoneId,
        door.zone_from?.zone_id ?? null,
        door.zone_to.zone_id,
      );

      if (currentZoneId === zoneId && newZoneId !== zoneId && lastEnterTime) {
        totalMinutes += this.calculateDuration(
          scan.created_at,
          lastEnterTime,
          countFrom,
        );
        lastEnterTime = null;
      }

      if (currentZoneId !== zoneId && newZoneId === zoneId) {
        lastEnterTime = scan.created_at;
      }

      currentZoneId = newZoneId;
    }

    const isCurrentlyInZone = currentZoneId === zoneId;

    if (isCurrentlyInZone && lastEnterTime) {
      totalMinutes += this.calculateDuration(
        new Date(),
        lastEnterTime,
        countFrom,
      );
    }

    return {
      cumulativeTime: Math.floor(totalMinutes),
      isCurrentlyInZone,
    };
  }

  private calculateDuration(
    endTime: Date,
    startTime: Date,
    countFrom: Date,
  ): number {
    const effectiveStartTime = startTime < countFrom ? countFrom : startTime;

    if (endTime <= effectiveStartTime) {
      return TIME_LIMIT_CHECK_CONSTANTS.LIMITS.INITIAL_TOTAL_MINUTES;
    }

    const durationMs = endTime.getTime() - effectiveStartTime.getTime();
    return durationMs / TIME_LIMIT_CHECK_CONSTANTS.TIME.MILLISECONDS_PER_MINUTE;
  }

  private async createViolationNotification(
    employee: Employee,
    zone: Zone,
  ): Promise<void> {
    const positionNames = employee.positions.map((p) => p.role).join(', ');

    const notification = await this.notificationsService.createNotification(
      NOTIFICATION_CONSTANTS.TITLES.TIME_LIMIT_EXCEEDED,
      NOTIFICATION_CONSTANTS.MESSAGE_TEMPLATES.TIME_LIMIT_EXCEEDED(
        employee.full_name,
        positionNames,
        zone.title,
      ),
      employee,
      zone,
    );

    const zoneWithAdmin = await this.fetchZoneWithAdmin(zone.zone_id);
    const payload = this.createNotificationPayload(notification);

    if (zoneWithAdmin?.building.organization.organization_admin) {
      this.notificationsGateway.emitNotificationToAdmin(
        zoneWithAdmin.building.organization.organization_admin
          .organization_admin_id,
        payload,
      );
    }

    this.notificationsGateway.emitNotificationToEmployee(
      employee.employee_id,
      payload,
    );
  }

  private async fetchZoneWithAdmin(zoneId: number): Promise<Zone | null> {
    return this.zoneRepository
      .createQueryBuilder('zone')
      .leftJoinAndSelect('zone.building', 'building')
      .leftJoinAndSelect('building.organization', 'organization')
      .leftJoinAndSelect(
        'organization.organization_admin',
        'organization_admin',
      )
      .where('zone.zone_id = :zoneId', { zoneId })
      .getOne();
  }

  private createNotificationPayload(notification: {
    notification_id: number;
    title: string;
    message: string;
    created_at: Date;
  }): NotificationPayload {
    return {
      notification_id: notification.notification_id,
      title: notification.title,
      message: notification.message,
      is_read: false,
      created_at: notification.created_at,
    };
  }
}
