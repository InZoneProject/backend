import { Employee } from '../employees/entities/employee.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { EmployeeDailyMovementsResponseDto } from './dto/employee-daily-movements-response.dto';
import { EmployeeInfoDto } from './dto/employee-info.dto';
import { EmployeeMovementItemDto } from './dto/employee-movement-item.dto';
import { EmployeeViolationDto } from './dto/employee-violation.dto';

export class BuildingsMovementsMapper {
  static toEmployeeInfo(employee: Employee): EmployeeInfoDto {
    return {
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      photo: employee.photo,
    };
  }

  static toMovementItem(
    scanEventId: number,
    createdAt: Date,
    doorId: number,
    floorId: number,
    zoneFromId: number | null,
    zoneToId: number | null,
  ): EmployeeMovementItemDto {
    return {
      scan_event_id: scanEventId,
      created_at: createdAt,
      door_id: doorId,
      floor_id: floorId,
      zone_from_id: zoneFromId,
      zone_to_id: zoneToId,
    };
  }

  static toViolation(notification: Notification): EmployeeViolationDto {
    return {
      notification_id: notification.notification_id,
      title: notification.title,
      message: notification.message,
      created_at: notification.created_at,
      zone: {
        zone_id: notification.zone.zone_id,
        title: notification.zone.title,
        floor_id: notification.zone.floor?.floor_id ?? null,
        building_id: notification.zone.building.building_id,
      },
    };
  }

  static toDailyMovementsResponse(
    employee: Employee,
    movements: EmployeeMovementItemDto[],
    violations: EmployeeViolationDto[],
  ): EmployeeDailyMovementsResponseDto {
    return {
      employee: this.toEmployeeInfo(employee),
      movements,
      violations,
    };
  }
}
