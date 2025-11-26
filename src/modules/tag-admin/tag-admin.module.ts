import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagAdminController } from './tag-admin.controller';
import { TagAdminService } from './tag-admin.service';
import { TagAdmin } from './entities/tag-admin.entity';
import { TagAssignment } from './entities/tag-assignment.entity';
import { Employee } from '../employees/entities/employee.entity';
import { RfidTag } from '../rfid/entities/rfid-tag.entity';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TagAdmin, TagAssignment, Employee, RfidTag]),
    SharedModule,
  ],
  controllers: [TagAdminController],
  providers: [TagAdminService],
  exports: [TagAdminService, TypeOrmModule],
})
export class TagAdminModule {}
