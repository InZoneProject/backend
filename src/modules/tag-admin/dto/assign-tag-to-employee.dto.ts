import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AssignTagToEmployeeDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  employee_id: number;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  rfid_tag_id: number;
}
