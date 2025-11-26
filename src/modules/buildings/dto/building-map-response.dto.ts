import { ApiProperty } from '@nestjs/swagger';
import { FloorMapDto } from './floor-map.dto';
import { ZoneMapDto } from './zone-map.dto';
import { DoorMapDto } from './door-map.dto';

export class BuildingMapResponseDto {
  @ApiProperty()
  building_id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  address: string | null;

  @ApiProperty({ type: [FloorMapDto] })
  floors: FloorMapDto[];

  @ApiProperty({ type: [ZoneMapDto] })
  zones: ZoneMapDto[];

  @ApiProperty({ type: [DoorMapDto] })
  doors: DoorMapDto[];
}
