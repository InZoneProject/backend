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
import { RedisService } from '../redis/redis.service';
import { NOTIFICATIONS_CACHE_CONSTANTS } from './notifications-cache.constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
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
    const savedNotification =
      await this.notificationRepository.save(notification);

    if (title === NOTIFICATION_CONSTANTS.TITLES.TIME_LIMIT_EXCEEDED) {
      await this.cacheLastTimeLimitNotification(savedNotification);
    }

    return savedNotification;
  }

  async getLastNotification(
    employeeId: number,
    zoneId: number,
  ): Promise<Notification | null> {
    const startOfDay = this.getStartOfDay();
    const cachedNotificationId = await this.redisService.getString(
      NOTIFICATIONS_CACHE_CONSTANTS.KEYS.LAST_TIME_LIMIT(
        employeeId,
        zoneId,
        this.getDayKey(startOfDay),
      ),
    );

    if (cachedNotificationId !== null) {
      const notification = await this.notificationRepository.findOne({
        where: { notification_id: Number(cachedNotificationId) },
      });

      if (notification) return notification;
    }

    const notification = await this.notificationRepository.findOne({
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

    if (notification) {
      await this.redisService.setString(
        NOTIFICATIONS_CACHE_CONSTANTS.KEYS.LAST_TIME_LIMIT(
          employeeId,
          zoneId,
          this.getDayKey(notification.created_at),
        ),
        String(notification.notification_id),
        this.getPositiveNumberConfig(
          'NOTIFICATION_LAST_TIME_LIMIT_TTL_SECONDS',
        ),
      );
    }

    return notification;
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
  ) {
    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { employee: { employee_id: employeeId } },
        order: { created_at: 'DESC' },
        skip: offset,
        take: limit,
      });

    return {
      items: notifications.map((n) => this.mapToNotificationResponse(n)),
      total,
      offset,
      limit,
    };
  }

  async getAdminNotifications(
    userId: number,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ) {
    const organizationIds = await this.getAdminOrganizationIds(userId);

    if (organizationIds.length === 0) {
      return { items: [], total: 0, offset, limit };
    }

    const [notifications, total] = await this.notificationRepository
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
      .getManyAndCount();

    return {
      items: notifications.map((n) => this.mapToAdminNotificationResponse(n)),
      total,
      offset,
      limit,
    };
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

  private getDayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private async cacheLastTimeLimitNotification(
    notification: Notification,
  ): Promise<void> {
    await this.redisService.setString(
      NOTIFICATIONS_CACHE_CONSTANTS.KEYS.LAST_TIME_LIMIT(
        notification.employee.employee_id,
        notification.zone.zone_id,
        this.getDayKey(notification.created_at),
      ),
      String(notification.notification_id),
      this.getPositiveNumberConfig('NOTIFICATION_LAST_TIME_LIMIT_TTL_SECONDS'),
    );
  }

  private getPositiveNumberConfig(key: string): number {
    const value = Number(this.configService.getOrThrow<string>(key));
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${key} must be a positive number`);
    }

    return value;
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
