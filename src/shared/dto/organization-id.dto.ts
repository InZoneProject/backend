import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OrganizationIdDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  organization_id: number;
}
