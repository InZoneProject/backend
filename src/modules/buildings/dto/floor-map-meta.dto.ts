import { ApiProperty } from '@nestjs/swagger';

export class FloorMapMetaDto {
  @ApiProperty()
  limit: number;

  @ApiProperty({ nullable: true })
  next_cursor: number | null;

  @ApiProperty()
  has_more: boolean;

  @ApiProperty()
  is_lod: boolean;
}
