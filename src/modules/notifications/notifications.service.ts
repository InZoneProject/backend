import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';
import { Organization } from '../organizations/entities/organization.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

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
    const organizations = await this.organizationRepository.find({
      where: { organization_admin: { organization_admin_id: userId } },
      select: ['organization_id'],
    });

    const organizationIds = organizations.map((org) => org.organization_id);

    if (organizationIds.length === 0) {
      return;
    }

    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read_by_org_admin: true })
      .where('is_read_by_org_admin = :isRead', { isRead: false })
      .andWhere('organization_id IN (:...organizationIds)', { organizationIds })
      .execute();
  }

  async getEmployeeNotifications(
    employeeId: number,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ) {
    const notifications = await this.notificationRepository.find({
      where: { employee: { employee_id: employeeId } },
      order: { created_at: 'DESC' },
      skip: offset,
      take: limit,
    });

    return notifications.map((notification) => ({
      notification_id: notification.notification_id,
      title: notification.title,
      message: notification.message,
      is_read: notification.is_read_by_employee,
      created_at: notification.created_at,
    }));
  }

  async getAdminNotifications(
    userId: number,
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ) {
    const organizations = await this.organizationRepository.find({
      where: { organization_admin: { organization_admin_id: userId } },
      select: ['organization_id'],
    });

    const organizationIds = organizations.map((org) => org.organization_id);

    if (organizationIds.length === 0) {
      return [];
    }

    const notifications = await this.notificationRepository.find({
      where: { organization: { organization_id: In(organizationIds) } },
      relations: ['employee'],
      order: { created_at: 'DESC' },
      skip: offset,
      take: limit,
    });

    return notifications.map((notification) => ({
      notification_id: notification.notification_id,
      title: notification.title,
      message: notification.message,
      is_read: notification.is_read_by_org_admin,
      employee_id: notification.employee.employee_id,
      created_at: notification.created_at,
    }));
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
    const organizations = await this.organizationRepository.find({
      where: { organization_admin: { organization_admin_id: userId } },
      select: ['organization_id'],
    });

    const organizationIds = organizations.map((org) => org.organization_id);

    if (organizationIds.length === 0) {
      return 0;
    }

    return this.notificationRepository.count({
      where: {
        organization: { organization_id: In(organizationIds) },
        is_read_by_org_admin: false,
      },
    });
  }
}
