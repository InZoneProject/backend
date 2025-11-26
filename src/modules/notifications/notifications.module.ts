import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SharedModule } from '../../shared/shared.module';
import { Organization } from '../organizations/entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, Organization]),
    SharedModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
