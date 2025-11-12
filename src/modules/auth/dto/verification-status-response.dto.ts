import { ApiProperty } from '@nestjs/swagger';

export class VerificationStatusResponseDto {
  @ApiProperty()
  is_verified: boolean;

  @ApiProperty({ required: false })
  created_at?: Date;

  @ApiProperty({ required: false })
  expires_at?: Date;
}
