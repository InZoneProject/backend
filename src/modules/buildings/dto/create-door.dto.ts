import { IsInt, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDoorDto {
  @ApiProperty()
  @IsNumber()
  @IsInt()
  zone_from_id: number;

  @ApiProperty()
  @IsNumber()
  @IsInt()
  zone_to_id: number;

  @ApiProperty()
  @IsNumber()
  @IsInt()
  floor_id: number;
}
