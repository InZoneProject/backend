import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RfidTag } from './entities/rfid-tag.entity';
import { RfidReader } from './entities/rfid-reader.entity';
import { ScanEvent } from './entities/scan-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RfidTag, RfidReader, ScanEvent])],
  controllers: [],
  providers: [],
  exports: [],
})
export class RfidModule {}
