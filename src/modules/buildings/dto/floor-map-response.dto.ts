import { ApiProperty } from '@nestjs/swagger';
import { ZoneMapDto } from './zone-map.dto';
import { DoorMapDto } from './door-map.dto';

export class FloorMapResponseDto {
  @ApiProperty({ type: [ZoneMapDto] })
  zones: ZoneMapDto[];

  @ApiProperty({ type: [DoorMapDto] })
  doors: DoorMapDto[];
}
