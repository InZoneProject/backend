import { ApiProperty } from '@nestjs/swagger';

export class ZoneClusterDto {
  @ApiProperty()
  x_coordinate: number;

  @ApiProperty()
  y_coordinate: number;

  @ApiProperty()
  width: number;

  @ApiProperty()
  height: number;

  @ApiProperty()
  zones_count: number;
}
