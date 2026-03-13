import { ApiProperty } from '@nestjs/swagger';
import { FloorInfoDto } from './floor-info.dto';

export class BuildingInfoResponseDto {
  @ApiProperty()
  building_id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  address: string | null;

  @ApiProperty({ type: [FloorInfoDto] })
  floors: FloorInfoDto[];
}
