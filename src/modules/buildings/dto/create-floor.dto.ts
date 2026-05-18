import { IsNumber, IsInt, Min, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

export class CreateFloorDto {
  @ApiProperty()
  @IsNumber()
  @IsInt()
  @Min(1)
  floor_number: number;

  @ApiProperty()
  @IsString()
  @MaxLength(COLUMN_LENGTHS.TITLE)
  floor_name: string;
}
