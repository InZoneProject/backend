import { ApiProperty } from '@nestjs/swagger';
import { PositionInfoDto } from './position-info.dto';

export class ZoneWithPositionsDto {
  @ApiProperty()
  zone_id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: [PositionInfoDto] })
  positions: PositionInfoDto[];
}
