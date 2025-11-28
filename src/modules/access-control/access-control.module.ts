import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZoneAccessRule } from './entities/zone-access-rule.entity';
import { ZoneRuleAssignment } from './entities/zone-rule-assignment.entity';
import { Zone } from '../buildings/entities/zone.entity';
import { Position } from '../organizations/entities/position.entity';
import { Employee } from '../employees/entities/employee.entity';
import { ScanEvent } from '../rfid/entities/scan-event.entity';
import { Door } from '../buildings/entities/door.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';
import { TimeLimitCheckService } from './time-limit-check.service';
import { SharedModule } from '../../shared/shared.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZoneAccessRule,
      ZoneRuleAssignment,
      Zone,
      Position,
      Employee,
      ScanEvent,
      Door,
      Organization,
    ]),
    SharedModule,
    NotificationsModule,
    RealtimeModule,
  ],
  controllers: [AccessControlController],
  providers: [AccessControlService, TimeLimitCheckService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
