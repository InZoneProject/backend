import { ApiProperty } from '@nestjs/swagger';
import { ZoneMapDto } from './zone-map.dto';
import { DoorMapDto } from './door-map.dto';
import { FloorMapMetaDto } from './floor-map-meta.dto';
import { ZoneClusterDto } from './zone-cluster.dto';

export class FloorMapResponseDto {
  @ApiProperty({ type: [ZoneMapDto] })
  zones: ZoneMapDto[];

  @ApiProperty({ type: [DoorMapDto] })
  doors: DoorMapDto[];

  @ApiProperty({ type: [ZoneMapDto] })
  transition_validation_zones: ZoneMapDto[];

  @ApiProperty({ type: [DoorMapDto] })
  transition_validation_doors: DoorMapDto[];

  @ApiProperty({ type: [Number] })
  deletable_zone_ids: number[];

  @ApiProperty({ type: [Number] })
  deletable_door_ids: number[];

  @ApiProperty({ type: FloorMapMetaDto })
  map_meta: FloorMapMetaDto;

  @ApiProperty({ type: [ZoneClusterDto] })
  zone_clusters: ZoneClusterDto[];
}
