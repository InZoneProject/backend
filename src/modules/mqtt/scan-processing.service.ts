import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RfidReader } from '../rfid/entities/rfid-reader.entity';
import { RfidTag } from '../rfid/entities/rfid-tag.entity';
import { ScanEvent } from '../rfid/entities/scan-event.entity';
import { TagAssignment } from '../tag-admin/entities/tag-assignment.entity';
import { Door } from '../buildings/entities/door.entity';
import { Zone } from '../buildings/entities/zone.entity';
import { ZoneRuleAssignment } from '../access-control/entities/zone-rule-assignment.entity';
import { Employee } from '../employees/entities/employee.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessType } from '../../shared/enums/access-type.enum';
import { Notification } from '../notifications/entities/notification.entity';
import { NOTIFICATION_CONSTANTS } from '../notifications/notifications.constants';
import { determineNewZoneById } from '../../shared/utils/zone-navigation.util';

interface ScanResult {
  employeeId: number;
  newZoneId: number | null;
  buildingId: number | null;
  previousBuildingId?: number;
  organizationId: number;
  notification?: Notification;
}

@Injectable()
export class ScanProcessingService {
  constructor(
    @InjectRepository(RfidReader)
    private readonly rfidReaderRepository: Repository<RfidReader>,
    @InjectRepository(RfidTag)
    private readonly rfidTagRepository: Repository<RfidTag>,
    @InjectRepository(ScanEvent)
    private readonly scanEventRepository: Repository<ScanEvent>,
    @InjectRepository(TagAssignment)
    private readonly tagAssignmentRepository: Repository<TagAssignment>,
    @InjectRepository(Door)
    private readonly doorRepository: Repository<Door>,
    @InjectRepository(ZoneRuleAssignment)
    private readonly zoneRuleAssignmentRepository: Repository<ZoneRuleAssignment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async processScan(
    readerId: number,
    tagId: number,
  ): Promise<ScanResult | null> {
    const reader = await this.rfidReaderRepository.findOne({
      where: { rfid_reader_id: readerId },
      relations: ['organization'],
    });

    if (!reader) {
      return null;
    }

    const organizationId = reader.organization.organization_id;

    const tag = await this.rfidTagRepository.findOne({
      where: { rfid_tag_id: tagId },
      relations: ['organization'],
    });

    if (!tag) {
      return null;
    }

    if (tag.organization.organization_id !== organizationId) {
      return null;
    }

    const tagAssignment = await this.getActiveTagAssignment(tag.rfid_tag_id);

    if (!tagAssignment) {
      return null;
    }

    const employee = tagAssignment.employee;

    const door = await this.doorRepository.findOne({
      where: { rfid_reader: { rfid_reader_id: readerId } },
      relations: ['zone_from', 'zone_to', 'zone_to.building'],
    });

    if (!door) {
      return null;
    }

    const currentEmployeeZoneId = await this.getCurrentEmployeeZoneId(
      employee.employee_id,
    );

    const currentEmployeeZone = currentEmployeeZoneId
      ? await this.scanEventRepository.manager.findOne(Zone, {
          where: { zone_id: currentEmployeeZoneId },
          relations: ['building'],
        })
      : null;

    const previousBuildingId = currentEmployeeZone?.building?.building_id;

    const newZoneId = determineNewZoneById(
      currentEmployeeZoneId,
      door.zone_from?.zone_id ?? null,
      door.zone_to.zone_id,
    );

    await this.createScanEvent(reader, tag);

    let notification: Notification | undefined;

    const newZone = newZoneId
      ? await this.scanEventRepository.manager.findOne(Zone, {
          where: { zone_id: newZoneId },
          relations: ['building'],
        })
      : null;

    if (newZone && newZoneId !== currentEmployeeZoneId) {
      notification = await this.checkForbiddenZone(employee, newZone);
    }

    return {
      employeeId: employee.employee_id,
      newZoneId,
      buildingId: newZone?.building?.building_id ?? null,
      previousBuildingId: newZone === null ? previousBuildingId : undefined,
      organizationId,
      notification,
    };
  }

  private async getActiveTagAssignment(
    tagId: number,
  ): Promise<TagAssignment | null> {
    return await this.tagAssignmentRepository.findOne({
      where: {
        rfid_tag: { rfid_tag_id: tagId },
      },
      relations: ['employee'],
      order: { tag_assignment_change_date_and_time: 'DESC' },
    });
  }

  private async getCurrentEmployeeZoneId(
    employeeId: number,
  ): Promise<number | null> {
    const allScans = await this.scanEventRepository
      .createQueryBuilder('scan_event')
      .leftJoinAndSelect('scan_event.rfid_tag', 'rfid_tag')
      .leftJoinAndSelect('rfid_tag.tag_assignments', 'tag_assignment')
      .leftJoinAndSelect('scan_event.rfid_reader', 'rfid_reader')
      .where('tag_assignment.employee_id = :employeeId', { employeeId })
      .orderBy('scan_event.created_at', 'ASC')
      .addOrderBy('tag_assignment.tag_assignment_change_date_and_time', 'ASC')
      .getMany();

    if (allScans.length === 0) {
      return null;
    }

    let currentZoneId: number | null = null;

    for (const scan of allScans) {
      if (!scan.rfid_reader || !scan.rfid_tag) {
        continue;
      }

      const door = await this.doorRepository.findOne({
        where: {
          rfid_reader: { rfid_reader_id: scan.rfid_reader.rfid_reader_id },
        },
        relations: ['zone_from', 'zone_to', 'zone_to.building'],
      });

      if (!door) {
        continue;
      }

      currentZoneId = determineNewZoneById(
        currentZoneId,
        door.zone_from?.zone_id ?? null,
        door.zone_to.zone_id,
      );
    }

    return currentZoneId;
  }

  private async createScanEvent(
    reader: RfidReader,
    tag: RfidTag,
  ): Promise<ScanEvent> {
    const scanEvent = this.scanEventRepository.create({
      rfid_reader: reader,
      rfid_tag: tag,
    });

    return this.scanEventRepository.save(scanEvent);
  }

  private async checkForbiddenZone(
    employee: Employee,
    zone: Zone,
  ): Promise<Notification | undefined> {
    const employeeWithPositions = await this.employeeRepository.findOne({
      where: { employee_id: employee.employee_id },
      relations: ['positions'],
    });

    if (!employeeWithPositions || !employeeWithPositions.positions.length) {
      return undefined;
    }

    const employeePositionIds = employeeWithPositions.positions.map(
      (p) => p.position_id,
    );

    const zoneRuleAssignments = await this.zoneRuleAssignmentRepository.find({
      where: { zone: { zone_id: zone.zone_id } },
      relations: ['zone_access_rule', 'positions'],
    });

    const positionsWithRules = new Set<number>();
    const forbiddenPositions = new Set<number>();

    for (const assignment of zoneRuleAssignments) {
      const rulePositionIds = assignment.positions.map((p) => p.position_id);

      for (const posId of rulePositionIds) {
        positionsWithRules.add(posId);
        if (assignment.zone_access_rule.access_type === AccessType.FORBIDDEN) {
          forbiddenPositions.add(posId);
        }
      }
    }

    for (const empPosId of employeePositionIds) {
      if (!positionsWithRules.has(empPosId)) {
        return undefined;
      }

      if (
        positionsWithRules.has(empPosId) &&
        !forbiddenPositions.has(empPosId)
      ) {
        return undefined;
      }
    }

    const allPositionNames = employeeWithPositions.positions
      .map((p) => p.role)
      .join(', ');

    return await this.notificationsService.createNotification(
      NOTIFICATION_CONSTANTS.TITLES.UNAUTHORIZED_ZONE_ACCESS,
      NOTIFICATION_CONSTANTS.MESSAGE_TEMPLATES.UNAUTHORIZED_ZONE_ACCESS(
        employeeWithPositions.full_name,
        allPositionNames,
        zone.title,
      ),
      employeeWithPositions,
      zone,
    );
  }
}
