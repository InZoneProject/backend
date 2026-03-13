import {
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccessType } from '../../../shared/enums/access-type.enum';
import { ACCESS_CONTROL_CONSTANTS } from '../access-control.constants';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

export class UpdateZoneAccessRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(COLUMN_LENGTHS.TITLE)
  title?: string;

  @ApiPropertyOptional({ enum: AccessType })
  @IsOptional()
  @IsEnum(AccessType)
  access_type?: AccessType;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf(
    (dto: UpdateZoneAccessRuleDto) =>
      dto.access_type === AccessType.TIME_LIMITED,
  )
  @IsNumber()
  @IsInt()
  @Min(ACCESS_CONTROL_CONSTANTS.VALIDATION.MIN_DURATION)
  @Max(ACCESS_CONTROL_CONSTANTS.VALIDATION.MAX_DURATION)
  @Type(() => Number)
  max_duration_minutes?: number;
}
