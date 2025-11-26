import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AssignReaderToDoorDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  rfid_reader_id: number;
}
