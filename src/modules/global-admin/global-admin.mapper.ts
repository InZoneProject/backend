import { InviteToken } from './entities/invite-token.entity';
import { OrganizationAdmin } from '../organizations/entities/organization-admin.entity';
import { InviteHistoryItemDto } from './dto/invite-history-item.dto';
import { OrganizationAdminItemDto } from './dto/organization-admin-item.dto';

export class GlobalAdminMapper {
  static toInviteHistoryItemDto(token: InviteToken): InviteHistoryItemDto {
    if (!token.used_at || !token.used_by_organization_admin) {
      throw new Error('Token must be used to convert to InviteHistoryItemDto');
    }

    return {
      created_at: token.created_at,
      expires_at: token.expires_at,
      used_at: token.used_at,
      used_by: token.used_by_organization_admin.email,
    };
  }

  static toOrganizationAdminItemDto(
    admin: OrganizationAdmin,
  ): OrganizationAdminItemDto {
    return {
      organization_admin_id: admin.organization_admin_id,
      full_name: admin.full_name,
      email: admin.email,
      phone: admin.phone,
      photo: admin.photo,
      created_at: admin.created_at,
      organizations_count: admin.organizations?.length || 0,
    };
  }
}
