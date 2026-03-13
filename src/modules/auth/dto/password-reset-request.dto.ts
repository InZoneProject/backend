import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class PasswordResetRequestDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
