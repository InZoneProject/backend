import { IsInt, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { COLUMN_LENGTHS } from '../../../shared/constants/column-lengths';

export class CreateRfidTagDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  organization_id: number;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  tag_uid: number;

  @ApiProperty()
  @IsString()
  @MaxLength(COLUMN_LENGTHS.TITLE)
  name: string;
}
