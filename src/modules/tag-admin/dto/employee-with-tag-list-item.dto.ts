import { ApiProperty } from '@nestjs/swagger';

export class EmployeeWithTagListItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  full_name: string;

  @ApiProperty({ nullable: true })
  email: string;

  @ApiProperty({ nullable: true })
  photo: string | null;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty()
  has_assigned_tag: boolean;

  @ApiProperty()
  created_at: Date;
}
