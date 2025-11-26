import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';
import { AccessType } from '../../../shared/enums/access-type.enum';
import { ACCESS_CONTROL_CONSTANTS } from '../access-control.constants';

export class CreateZoneAccessRuleDto {
  @ApiProperty()
  @IsNumber()
  @IsInt()
  @Type(() => Number)
  organization_id: number;

  @ApiProperty()
  @IsString()
  @MaxLength(COLUMN_LENGTHS.TITLE)
  title: string;

  @ApiProperty({ enum: AccessType })
  @IsEnum(AccessType)
  access_type: AccessType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(ACCESS_CONTROL_CONSTANTS.VALIDATION.MIN_DURATION)
  @Max(ACCESS_CONTROL_CONSTANTS.VALIDATION.MAX_DURATION)
  @Type(() => Number)
  max_duration_minutes?: number;
}
