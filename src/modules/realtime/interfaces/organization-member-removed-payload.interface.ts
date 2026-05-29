import { OrganizationMemberRole } from '../../../shared/enums/organization-member-role.enum';

export interface OrganizationMemberRemovedPayload {
  organization_id: number;
  member_id: number;
  role: OrganizationMemberRole;
}
