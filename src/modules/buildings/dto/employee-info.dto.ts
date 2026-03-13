import { ApiProperty } from '@nestjs/swagger';

export class EmployeeInfoDto {
  @ApiProperty()
  employee_id: number;

  @ApiProperty()
  full_name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ nullable: true })
  photo: string | null;
}
