import { ApiProperty } from '@nestjs/swagger';

export class DoorResponse {
  @ApiProperty()
  door_id: number;

  @ApiProperty()
  floor_id: number;

  @ApiProperty()
  created_at: Date;
}
