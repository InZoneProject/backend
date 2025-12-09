import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRfidTagDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  organization_id: number;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  tag_uid: number;
}
