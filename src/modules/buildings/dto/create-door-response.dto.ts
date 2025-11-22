import { ApiProperty } from '@nestjs/swagger';
import { DoorResponse } from './door-response.dto';

export class CreateDoorResponse extends DoorResponse {
  @ApiProperty()
  zone_from_id: number;

  @ApiProperty()
  zone_to_id: number;
}
