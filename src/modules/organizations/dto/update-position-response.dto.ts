import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePositionResponseDto {
  @ApiProperty()
  role: string;

  @ApiPropertyOptional()
  description?: string;
}
