import { ApiProperty } from '@nestjs/swagger';

export class UpdateZonePhotoDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  photo: Express.Multer.File;
}
