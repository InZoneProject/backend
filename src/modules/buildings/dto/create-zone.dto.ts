import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsInt,
  Min,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

export class CreateZoneDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(COLUMN_LENGTHS.TITLE)
  title: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @Min(2)
  width: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @Min(2)
  height: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  x_coordinate: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  y_coordinate: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  building_id: number;

  @ApiProperty()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_transition_between_floors: boolean;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsOptional()
  floor_id?: number;
}
