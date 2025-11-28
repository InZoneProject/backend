import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';
import { Organization } from '../organizations/entities/organization.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Zone } from '../buildings/entities/zone.entity';
import { NOTIFICATION_CONSTANTS } from './notifications.constants';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { AdminNotificationResponseDto } from './dto/admin-notification-response.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async createNotification(
    title: string,
    message: string,
    employee: Employee,
    zone: Zone,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      title,
      message,
      employee,
      zone,
    });
    return this.notificationRepository.save(notification);
  }

  async getLastNotification(
    employeeId: number,
    zoneId: number,
  ): Promise<Notification | null> {
    const startOfDay = this.getStartOfDay();

    return this.notificationRepository.findOne({
      where: {
        employee: { employee_id: employeeId },
        zone: { zone_id: zoneId },
        title: NOTIFICATION_CONSTANTS.TITLES.TIME_LIMIT_EXCEEDED,
        created_at: MoreThanOrEqual(startOfDay),
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async countNotifications(
    employeeId: number,
    zoneId: number,
  ): Promise<number> {
    const startOfDay = this.getStartOfDay();

    return this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.employee_id = :employeeId', { employeeId })
      .andWhere('notification.zone_id = :zoneId', { zoneId })
      .andWhere('notification.title = :title', {
        title: NOTIFICATION_CONSTANTS.TITLES.TIME_LIMIT_EXCEEDED,
      })
      .andWhere('notification.created_at >= :startOfDay', { startOfDay })
      .getCount();
  }

  async markAllAsReadByEmployee(employeeId: number): Promise<void> {
    await this.notificationRepository.update(
      {
        employee: { employee_id: employeeId },
        is_read_by_employee: false,
      },
      { is_read_by_employee: true },
    );
  }

  async markAllAsReadByAdmin(userId: number): Promise<void> {
    const organizationIds = await this.getAdminOrganizationIds(userId);

    if (organizationIds.length === 0) {
      return;
    }

    const subQuery = this.notificationRepository
      .createQueryBuilder('n')
      .select('n.notification_id')
      .innerJoin('n.zone', 'zone')
      .innerJoin('zone.building', 'building')
      .where('building.organization_id IN (:...organizationIds)', {
        organizationIds,
      })
      .andWhere('n.is_read_by_org_admin = :isRead', { isRead: false })
      .getQuery();

    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read_by_org_admin: true })
      .where(`notification_id IN (${subQuery})`)
      .setParameters({ organizationIds, isRead: false })
      .execute();
  }

  async getEmployeeNotifications(
    employeeId: number,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationRepository.find({
      where: { employee: { employee_id: employeeId } },
      order: { created_at: 'DESC' },
      skip: offset,
      take: limit,
    });

    return notifications.map((n) => this.mapToNotificationResponse(n));
  }

  async getAdminNotifications(
    userId: number,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ): Promise<AdminNotificationResponseDto[]> {
    const organizationIds = await this.getAdminOrganizationIds(userId);

    if (organizationIds.length === 0) {
      return [];
    }

    const notifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .innerJoinAndSelect('notification.employee', 'employee')
      .innerJoin('notification.zone', 'zone')
      .innerJoin('zone.building', 'building')
      .where('building.organization_id IN (:...organizationIds)', {
        organizationIds,
      })
      .orderBy('notification.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return notifications.map((n) => this.mapToAdminNotificationResponse(n));
  }

  async getEmployeeUnreadCount(employeeId: number): Promise<number> {
    return this.notificationRepository.count({
      where: {
        employee: { employee_id: employeeId },
        is_read_by_employee: false,
      },
    });
  }

  async getAdminUnreadCount(userId: number): Promise<number> {
    const organizationIds = await this.getAdminOrganizationIds(userId);

    if (organizationIds.length === 0) {
      return 0;
    }

    return this.notificationRepository
      .createQueryBuilder('notification')
      .innerJoin('notification.zone', 'zone')
      .innerJoin('zone.building', 'building')
      .where('building.organization_id IN (:...organizationIds)', {
        organizationIds,
      })
      .andWhere('notification.is_read_by_org_admin = :isRead', {
        isRead: false,
      })
      .getCount();
  }

  private async getAdminOrganizationIds(userId: number): Promise<number[]> {
    const organizations = await this.organizationRepository.find({
      where: { organization_admin: { organization_admin_id: userId } },
      select: ['organization_id'],
    });

    return organizations.map((org) => org.organization_id);
  }

  private getStartOfDay(): Date {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  }

  private mapToNotificationResponse(
    notification: Notification,
  ): NotificationResponseDto {
    return {
      notification_id: notification.notification_id,
      title: notification.title,
      message: notification.message,
      is_read: notification.is_read_by_employee,
      created_at: notification.created_at,
    };
  }

  private mapToAdminNotificationResponse(
    notification: Notification,
  ): AdminNotificationResponseDto {
    return {
      notification_id: notification.notification_id,
      title: notification.title,
      message: notification.message,
      is_read: notification.is_read_by_org_admin,
      employee_id: notification.employee.employee_id,
      created_at: notification.created_at,
    };
  }
}
