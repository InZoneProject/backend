import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

export class VerifyEmailDto {
  @ApiProperty({
    example: '123456',
    description: 'Verification code received via email',
  })
  @IsString()
  @IsNotEmpty()
  @Length(COLUMN_LENGTHS.VERIFICATION_CODE, COLUMN_LENGTHS.VERIFICATION_CODE)
  code: string;
}
