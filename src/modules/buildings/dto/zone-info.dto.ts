import { ApiProperty } from '@nestjs/swagger';

export class ZoneInfoDto {
  @ApiProperty()
  zone_id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  floor_id: number | null;

  @ApiProperty()
  building_id: number;
}
