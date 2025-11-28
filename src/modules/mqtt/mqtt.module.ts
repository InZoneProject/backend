import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MqttService } from './mqtt.service';
import { MqttController } from './mqtt.controller';
import { MqttAuthService } from './mqtt-auth.service';
import { ScanProcessingService } from './scan-processing.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { RfidReader } from '../rfid/entities/rfid-reader.entity';
import { RfidTag } from '../rfid/entities/rfid-tag.entity';
import { ScanEvent } from '../rfid/entities/scan-event.entity';
import { TagAssignment } from '../tag-admin/entities/tag-assignment.entity';
import { Door } from '../buildings/entities/door.entity';
import { ZoneRuleAssignment } from '../access-control/entities/zone-rule-assignment.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TokenHashService } from '../../shared/services/token-hash.service';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => RealtimeModule),
    NotificationsModule,
    TypeOrmModule.forFeature([
      RfidReader,
      RfidTag,
      ScanEvent,
      TagAssignment,
      Door,
      ZoneRuleAssignment,
      Employee,
      Organization,
    ]),
  ],
  controllers: [MqttController],
  providers: [
    MqttService,
    MqttAuthService,
    ScanProcessingService,
    TokenHashService,
  ],
  exports: [MqttService, ScanProcessingService],
})
export class MqttModule {}
