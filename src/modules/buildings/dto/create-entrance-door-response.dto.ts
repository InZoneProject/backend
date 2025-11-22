import { ApiProperty } from '@nestjs/swagger';
import { DoorSide } from '../enums/door-side.enum';
import { DoorResponse } from './door-response.dto';

export class CreateEntranceDoorResponse extends DoorResponse {
  @ApiProperty()
  zone_id: number;

  @ApiProperty({ enum: DoorSide })
  entrance_door_side: DoorSide;
}
