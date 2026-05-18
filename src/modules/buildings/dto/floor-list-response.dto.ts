import { ApiProperty } from '@nestjs/swagger';
import { FloorInfoDto } from './floor-info.dto';

export class FloorListResponseDto {
  @ApiProperty({ type: [FloorInfoDto] })
  items: FloorInfoDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  offset: number;

  @ApiProperty()
  limit: number;
}
