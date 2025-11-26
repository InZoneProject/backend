import { ApiProperty } from '@nestjs/swagger';
import { OrganizationMemberRole } from '../enums/organization-member-role.enum';

export class OrganizationMemberRawDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  full_name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  photo: string | null;

  @ApiProperty({ enum: OrganizationMemberRole })
  role: OrganizationMemberRole;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  sort_order: number;

  @ApiProperty({ type: [Number], nullable: true })
  position_ids: number[] | null;
}
