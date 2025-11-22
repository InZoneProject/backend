import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AUTH_CONSTANTS } from '../auth/auth.constants';
import { GLOBAL_ADMIN_CONSTANTS } from './global-admin.constants';
import { PAGINATION_CONSTANTS } from '../../shared/constants/pagination.constants';
import { InviteToken } from './entities/invite-token.entity';
import { OrganizationAdmin } from '../organizations/entities/organization-admin.entity';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InviteHistoryResponseDto } from './dto/invite-history-response.dto';
import { OrganizationAdminListResponseDto } from './dto/organization-admin-list-response.dto';
import { InviteTokenType } from './enums/invite-token-type.enum';
import { GlobalAdminMapper } from './global-admin.mapper';
import { InviteTokenService } from '../../shared/services/invite-token.service';

@Injectable()
export class GlobalAdminService {
  constructor(
    @InjectRepository(InviteToken)
    private inviteTokenRepository: Repository<InviteToken>,
    @InjectRepository(OrganizationAdmin)
    private organizationAdminRepository: Repository<OrganizationAdmin>,
    private inviteTokenService: InviteTokenService,
  ) {}

  async generateInviteToken(): Promise<InviteResponseDto> {
    await this.inviteTokenService.deleteExpiredUnusedTokens({
      tokenType: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
    });

    const existingToken = await this.inviteTokenService.findActiveToken({
      tokenType: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
    });

    if (existingToken) {
      throw new ConflictException(
        AUTH_CONSTANTS.ERROR_MESSAGES.ACTIVE_INVITE_TOKEN_EXISTS,
      );
    }

    return this.inviteTokenService.generateInviteToken({
      tokenType: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
      frontendPath: '/register',
    });
  }

  async getValidInviteToken(): Promise<InviteResponseDto | null> {
    const storedToken = await this.inviteTokenService.findActiveToken({
      tokenType: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
    });

    return this.inviteTokenService.getInviteStatus(storedToken, '/register');
  }

  async getInviteTokenHistory(
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ): Promise<InviteHistoryResponseDto> {
    const [tokens, total] = await this.inviteTokenRepository.findAndCount({
      where: {
        is_used: true,
        invite_type: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
      },
      relations: ['used_by_organization_admin'],
      order: { created_at: 'DESC' },
      skip: offset,
      take: limit,
    });

    const items = tokens
      .filter((token) => token.used_at && token.used_by_organization_admin)
      .map((token) => GlobalAdminMapper.toInviteHistoryItemDto(token));

    return {
      items,
      total,
    };
  }

  async getAllOrganizationAdmins(
    offset: number = PAGINATION_CONSTANTS.DEFAULT_OFFSET,
    limit: number = PAGINATION_CONSTANTS.DEFAULT_LIMIT,
  ): Promise<OrganizationAdminListResponseDto> {
    const [items, total] = await this.organizationAdminRepository.findAndCount({
      skip: offset,
      take: limit,
      relations: ['organizations'],
      order: { created_at: 'DESC' },
    });

    return {
      items: items.map((admin) =>
        GlobalAdminMapper.toOrganizationAdminItemDto(admin),
      ),
      total,
    };
  }

  async deleteOrganizationAdmin(id: number): Promise<void> {
    const admin = await this.organizationAdminRepository.findOne({
      where: { organization_admin_id: id },
    });

    if (!admin) {
      throw new NotFoundException(
        GLOBAL_ADMIN_CONSTANTS.ERROR_MESSAGES.ORGANIZATION_ADMIN_NOT_FOUND.replace(
          '$id',
          id.toString(),
        ),
      );
    }

    await this.organizationAdminRepository.remove(admin);
  }
}
