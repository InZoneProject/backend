import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class RegisterByInviteRequestDto extends RegisterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  invite_token: string;
}
