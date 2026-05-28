import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RfidTag } from './entities/rfid-tag.entity';
import { RfidReader } from './entities/rfid-reader.entity';
import { ScanEvent } from './entities/scan-event.entity';
import { Door } from '../buildings/entities/door.entity';
import { TagAdmin } from '../tag-admin/entities/tag-admin.entity';
import { Employee } from '../employees/entities/employee.entity';
import { RfidController } from './rfid.controller';
import { RfidService } from './rfid.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RfidTag,
      RfidReader,
      ScanEvent,
      Door,
      TagAdmin,
      Employee,
    ]),
    SharedModule,
  ],
  controllers: [RfidController],
  providers: [RfidService],
  exports: [RfidService],
})
export class RfidModule {}
