import { ApiProperty } from '@nestjs/swagger';

export class EmployeeMovementItemDto {
  @ApiProperty()
  scan_event_id: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  door_id: number;

  @ApiProperty()
  floor_id: number;

  @ApiProperty({ nullable: true })
  zone_from_id: number | null;

  @ApiProperty({ nullable: true })
  zone_to_id: number | null;
}
