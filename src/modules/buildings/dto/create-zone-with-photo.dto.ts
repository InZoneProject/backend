import { ApiProperty } from '@nestjs/swagger';
import { CreateZoneDto } from './create-zone.dto';

export class CreateZoneWithPhotoDto extends CreateZoneDto {
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  photo?: Express.Multer.File;
}
