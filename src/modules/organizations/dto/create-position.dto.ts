import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePositionDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  organization_id: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}
