import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfilePhotoResponseDto {
  @ApiProperty()
  photo: string;
}
