import {
  Controller,
  Patch,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailVerificationGuard } from '../auth/guards/email-verification.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { RequestWithUser } from '../auth/types/request-with-user.types';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Patch('employee/mark-all-read')
  @Roles(UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsReadByEmployee(@Req() req: RequestWithUser): Promise<void> {
    await this.notificationsService.markAllAsReadByEmployee(req.user.sub);
  }

  @Patch('admin/mark-all-read')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsReadByAdmin(@Req() req: RequestWithUser): Promise<void> {
    await this.notificationsService.markAllAsReadByAdmin(req.user.sub);
  }

  @Get('employee')
  @Roles(UserRole.EMPLOYEE)
  async getEmployeeNotifications(
    @Req() req: RequestWithUser,
    @Query(
      'offset',
      new DefaultValuePipe(PAGINATION_CONSTANTS.DEFAULT_OFFSET),
      ParseIntPipe,
    )
    offset?: number,
    @Query(
      'limit',
      new DefaultValuePipe(PAGINATION_CONSTANTS.DEFAULT_LIMIT),
      ParseIntPipe,
    )
    limit?: number,
  ) {
    return this.notificationsService.getEmployeeNotifications(
      req.user.sub,
      offset,
      limit,
    );
  }

  @Get('admin')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async getAdminNotifications(
    @Req() req: RequestWithUser,
    @Query(
      'offset',
      new DefaultValuePipe(PAGINATION_CONSTANTS.DEFAULT_OFFSET),
      ParseIntPipe,
    )
    offset?: number,
    @Query(
      'limit',
      new DefaultValuePipe(PAGINATION_CONSTANTS.DEFAULT_LIMIT),
      ParseIntPipe,
    )
    limit?: number,
  ) {
    return this.notificationsService.getAdminNotifications(
      req.user.sub,
      offset,
      limit,
    );
  }

  @Get('employee/unread-count')
  @Roles(UserRole.EMPLOYEE)
  async getEmployeeUnreadCount(@Req() req: RequestWithUser) {
    const count = await this.notificationsService.getEmployeeUnreadCount(
      req.user.sub,
    );
    return { unread_count: count };
  }

  @Get('admin/unread-count')
  @Roles(UserRole.ORGANIZATION_ADMIN)
  async getAdminUnreadCount(@Req() req: RequestWithUser) {
    const count = await this.notificationsService.getAdminUnreadCount(
      req.user.sub,
    );
    return { unread_count: count };
  }
}
