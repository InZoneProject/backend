import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

export class CreateRfidReaderDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  organization_id: number;

  @ApiProperty()
  @IsString()
  @MaxLength(COLUMN_LENGTHS.TITLE)
  name: string;
}
