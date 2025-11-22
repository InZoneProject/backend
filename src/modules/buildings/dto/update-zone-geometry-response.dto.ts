import { ApiProperty } from '@nestjs/swagger';
import { ZoneResponse } from './zone-response.dto';

export class UpdateZoneGeometryResponse extends ZoneResponse {
  @ApiProperty()
  width: number;

  @ApiProperty()
  height: number;

  @ApiProperty()
  x_coordinate: number;

  @ApiProperty()
  y_coordinate: number;
}
