import { ApiProperty } from '@nestjs/swagger';

export class FloorMapDto {
  @ApiProperty()
  floor_id: number;

  @ApiProperty()
  floor_number: number;
}
