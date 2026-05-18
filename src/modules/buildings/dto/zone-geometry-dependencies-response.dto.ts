import { ApiProperty } from '@nestjs/swagger';
import { DoorMapDto } from './door-map.dto';
import { FloorInfoDto } from './floor-info.dto';
import { ZoneMapDto } from './zone-map.dto';

export class ZoneGeometryDependenciesResponseDto {
  @ApiProperty({ type: [ZoneMapDto] })
  zones: ZoneMapDto[];

  @ApiProperty({ type: [DoorMapDto] })
  doors: DoorMapDto[];

  @ApiProperty({ type: [FloorInfoDto] })
  floors: FloorInfoDto[];
}
