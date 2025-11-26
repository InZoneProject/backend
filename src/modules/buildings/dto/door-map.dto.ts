import { ApiProperty } from '@nestjs/swagger';
import { DoorSide } from '../enums/door-side.enum';

export class DoorMapDto {
  @ApiProperty()
  door_id: number;

  @ApiProperty()
  is_entrance: boolean;

  @ApiProperty({ enum: DoorSide, nullable: true })
  entrance_door_side: DoorSide | null;

  @ApiProperty({ nullable: true })
  zone_from_id: number | null;

  @ApiProperty()
  zone_to_id: number;

  @ApiProperty()
  floor_id: number;
}
