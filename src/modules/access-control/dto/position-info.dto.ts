import { ApiProperty } from '@nestjs/swagger';

export class PositionInfoDto {
  @ApiProperty()
  position_id: number;

  @ApiProperty()
  role: string;
}
