import { IsEnum, IsInt, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DoorSide } from '../enums/door-side.enum';

export class CreateEntranceDoorDto {
  @ApiProperty()
  @IsNumber()
  @IsInt()
  zone_id: number;

  @ApiProperty({ enum: DoorSide })
  @IsEnum(DoorSide)
  entrance_door_side: DoorSide;

  @ApiProperty()
  @IsNumber()
  @IsInt()
  floor_id: number;
}
