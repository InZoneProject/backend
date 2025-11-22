import { ApiProperty } from '@nestjs/swagger';
import { ZoneResponse } from './zone-response.dto';

export class UpdateZoneTitleResponse extends ZoneResponse {
  @ApiProperty()
  title: string;
}
