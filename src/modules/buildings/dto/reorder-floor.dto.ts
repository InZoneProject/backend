import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReorderFloorDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  new_floor_number: number;
}
