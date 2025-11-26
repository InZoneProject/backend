import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileInfoResponseDto {
  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  phone_number?: string;
}
