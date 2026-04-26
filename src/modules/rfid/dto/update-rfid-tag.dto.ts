import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

export class UpdateRfidTagDto {
  @ApiProperty()
  @IsString()
  @MaxLength(COLUMN_LENGTHS.TITLE)
  name: string;
}
