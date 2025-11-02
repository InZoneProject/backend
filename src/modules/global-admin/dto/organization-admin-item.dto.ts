export class OrganizationAdminItemDto {
  organization_admin_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  photo: string | null;
  created_at: Date;
  organizations_count: number;
}
