import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateZoneTitleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;
}
