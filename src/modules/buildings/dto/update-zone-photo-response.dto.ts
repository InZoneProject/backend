import { ApiProperty } from '@nestjs/swagger';
import { ZoneResponse } from './zone-response.dto';

export class UpdateZonePhotoResponse extends ZoneResponse {
  @ApiProperty()
  photo: string | null;
}
