import { ApiProperty } from '@nestjs/swagger';

export class ZoneResponse {
  @ApiProperty()
  zone_id: number;
}
