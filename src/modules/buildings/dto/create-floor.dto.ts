import { IsNumber, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFloorDto {
  @ApiProperty()
  @IsNumber()
  @IsInt()
  @Min(1)
  floor_number: number;
}
