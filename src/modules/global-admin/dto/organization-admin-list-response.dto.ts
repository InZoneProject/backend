import { OrganizationAdminItemDto } from './organization-admin-item.dto';

export class OrganizationAdminListResponseDto {
  items: OrganizationAdminItemDto[];
  total: number;
}
