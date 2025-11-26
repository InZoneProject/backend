import { ApiProperty } from '@nestjs/swagger';

export class ZoneMapDto {
  @ApiProperty()
  zone_id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  is_transition_between_floors: boolean;

  @ApiProperty()
  width: number;

  @ApiProperty()
  height: number;

  @ApiProperty({ nullable: true })
  photo: string | null;

  @ApiProperty()
  x_coordinate: number;

  @ApiProperty()
  y_coordinate: number;

  @ApiProperty({ nullable: true })
  floor_id: number | null;
}
