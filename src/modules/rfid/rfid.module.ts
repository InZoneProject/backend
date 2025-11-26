import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RfidTag } from './entities/rfid-tag.entity';
import { RfidReader } from './entities/rfid-reader.entity';
import { ScanEvent } from './entities/scan-event.entity';
import { RfidController } from './rfid.controller';
import { RfidService } from './rfid.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RfidTag, RfidReader, ScanEvent]),
    SharedModule,
  ],
  controllers: [RfidController],
  providers: [RfidService],
  exports: [RfidService],
})
export class RfidModule {}
