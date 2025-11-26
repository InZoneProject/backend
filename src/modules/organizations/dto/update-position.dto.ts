import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePositionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}
