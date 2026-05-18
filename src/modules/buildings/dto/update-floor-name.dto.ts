import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

export class UpdateFloorNameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(COLUMN_LENGTHS.TITLE)
  floor_name: string;
}
