import { OrganizationMemberRole } from '../../../shared/enums/organization-member-role.enum';

export interface OrganizationMemberJoinedPayload {
  organization_id: number;
  member: {
    id: number;
    full_name: string;
    email: string;
    phone: string | null;
    photo: string | null;
    role: OrganizationMemberRole;
    created_at: Date;
  };
}
