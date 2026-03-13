import { ApiProperty } from '@nestjs/swagger';
import { ZoneInfoDto } from './zone-info.dto';

export class EmployeeViolationDto {
  @ApiProperty()
  notification_id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty({ type: ZoneInfoDto })
  zone: ZoneInfoDto;
}
