import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
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
import { TokenService } from '../../shared/services/token.service';

@Injectable()
export class GlobalAdminService {
  constructor(
    @InjectRepository(InviteToken)
    private inviteTokenRepository: Repository<InviteToken>,
    @InjectRepository(OrganizationAdmin)
    private organizationAdminRepository: Repository<OrganizationAdmin>,
    private configService: ConfigService,
    private tokenService: TokenService,
  ) {}

  async generateInviteToken(): Promise<InviteResponseDto> {
    await this.deleteExpiredUnusedTokens();

    const existingToken = await this.findActiveToken();
    if (existingToken) {
      throw new ConflictException(
        AUTH_CONSTANTS.ERROR_MESSAGES.ACTIVE_INVITE_TOKEN_EXISTS,
      );
    }

    const invite_token = this.tokenService.createJwtToken(
      InviteTokenType.ORGANIZATION_ADMIN_INVITE,
    );
    const token_encrypted = this.tokenService.encryptToken(invite_token);
    const expires_at = this.tokenService.calculateExpirationDate();

    await this.inviteTokenRepository.save({
      token_encrypted,
      expires_at,
      is_used: false,
      invite_type: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
    });

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    return {
      invite_url: `${frontendUrl}/register?token=${invite_token}`,
      expires_at,
    };
  }

  async getValidInviteToken(): Promise<InviteResponseDto | null> {
    const storedToken = await this.findActiveToken();

    if (!storedToken) {
      return null;
    }

    const invite_token = this.tokenService.decryptToken(
      storedToken.token_encrypted,
    );
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    return {
      invite_url: `${frontendUrl}/register?token=${invite_token}`,
      expires_at: storedToken.expires_at,
    };
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

  private async deleteExpiredUnusedTokens(): Promise<void> {
    await this.inviteTokenRepository.delete({
      expires_at: LessThan(new Date()),
      is_used: false,
      invite_type: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
    });
  }

  private async findActiveToken() {
    return this.inviteTokenRepository.findOne({
      where: {
        is_used: false,
        expires_at: MoreThan(new Date()),
        invite_type: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
      },
    });
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
