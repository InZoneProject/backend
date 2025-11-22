import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsInt,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

export class CreateBuildingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(COLUMN_LENGTHS.TITLE)
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(COLUMN_LENGTHS.ADDRESS)
  address?: string | null;

  @ApiProperty()
  @IsNumber()
  @IsInt()
  organization_id: number;
}
