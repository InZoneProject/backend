import { OrganizationItemDto } from './organization-item.dto';

export class OrganizationListResponseDto {
  items: OrganizationItemDto[];
  total: number;
}
