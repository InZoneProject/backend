import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { COLUMN_LENGTHS } from '../constants/column-lengths';

export class UpdateProfileInfoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(COLUMN_LENGTHS.FULL_NAME)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(COLUMN_LENGTHS.PHONE)
  phone_number?: string;
}
