import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';
import { ORGANIZATIONS_CONSTANTS } from '../organizations.constants';
import { ApiProperty } from '@nestjs/swagger';

export class OrganizationRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(COLUMN_LENGTHS.TITLE)
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(COLUMN_LENGTHS.DESCRIPTION)
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(ORGANIZATIONS_CONSTANTS.VALIDATION_PATTERNS.TIME, {
    message: ORGANIZATIONS_CONSTANTS.VALIDATION_MESSAGES.TIME_FORMAT,
  })
  work_day_start_time: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(ORGANIZATIONS_CONSTANTS.VALIDATION_PATTERNS.TIME, {
    message: ORGANIZATIONS_CONSTANTS.VALIDATION_MESSAGES.TIME_FORMAT,
  })
  work_day_end_time: string;
}
