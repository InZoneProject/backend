import { ApiProperty } from '@nestjs/swagger';
import { OrganizationMemberRole } from '../../../shared/enums/organization-member-role.enum';
import { Position } from '../../organizations/entities/position.entity';

export class EmployeeWithTagListItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  full_name: string;

  @ApiProperty({ nullable: true })
  email: string;

  @ApiProperty({ nullable: true })
  photo: string | null;

  @ApiProperty({ enum: OrganizationMemberRole })
  role: OrganizationMemberRole;

  @ApiProperty({ nullable: true, required: false })
  rfid_tag_id?: number | null;

  @ApiProperty({ type: [Position], required: false })
  positions?: Position[];

  @ApiProperty()
  created_at: Date;
}
