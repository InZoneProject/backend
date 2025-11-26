import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZoneAccessRule } from './entities/zone-access-rule.entity';
import { ZoneRuleAssignment } from './entities/zone-rule-assignment.entity';
import { Zone } from '../buildings/entities/zone.entity';
import { Position } from '../organizations/entities/position.entity';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZoneAccessRule,
      ZoneRuleAssignment,
      Zone,
      Position,
    ]),
    SharedModule,
  ],
  controllers: [AccessControlController],
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
