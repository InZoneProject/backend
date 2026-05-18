import { ApiProperty } from '@nestjs/swagger';
export class BuildingInfoResponseDto {
  @ApiProperty()
  building_id: number;

  @ApiProperty()
  organization_id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  address: string | null;

  @ApiProperty()
  created_at: Date;
}
