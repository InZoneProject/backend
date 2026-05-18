import { ApiProperty } from '@nestjs/swagger';

export class FloorInfoDto {
  @ApiProperty()
  floor_id: number;

  @ApiProperty()
  floor_number: number;

  @ApiProperty()
  floor_name: string;

  @ApiProperty()
  can_delete: boolean;
}
