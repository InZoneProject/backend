import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';
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
}
