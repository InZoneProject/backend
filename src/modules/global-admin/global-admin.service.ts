import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EncryptionUtil } from '../../shared/utils/encryption.util';
import { AUTH_CONSTANTS } from '../auth/auth.constants';
import { GLOBAL_ADMIN_CONSTANTS } from './global-admin.constants';
import { InviteToken } from './entities/invite-token.entity';
import { OrganizationAdmin } from '../organizations/entities/organization-admin.entity';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InviteHistoryResponseDto } from './dto/invite-history-response.dto';
import { InviteHistoryItemDto } from './dto/invite-history-item.dto';
import { OrganizationAdminListResponseDto } from './dto/organization-admin-list-response.dto';
import { InviteTokenType } from './enums/invite-token-type.enum';
import { InviteTokenPayload } from './types/invite-token-payload.types';

@Injectable()
export class GlobalAdminService {
  constructor(
    @InjectRepository(InviteToken)
    private inviteTokenRepository: Repository<InviteToken>,
    @InjectRepository(OrganizationAdmin)
    private organizationAdminRepository: Repository<OrganizationAdmin>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async generateInviteToken(): Promise<InviteResponseDto> {
    await this.deleteExpiredUnusedTokens();

    const existingToken = await this.findActiveToken();
    if (existingToken) {
      throw new ConflictException(
        AUTH_CONSTANTS.ERROR_MESSAGES.ACTIVE_INVITE_TOKEN_EXISTS,
      );
    }

    const invite_token = this.createJwtToken();
    const key = this.configService.getOrThrow<string>(
      'INVITE_TOKEN_ENCRYPTION_KEY',
    );
    const algorithm = this.configService.getOrThrow<string>(
      'ENCRYPTION_ALGORITHM',
    );
    const token_encrypted = EncryptionUtil.encrypt(
      invite_token,
      key,
      algorithm,
    );
    const expires_at = this.calculateExpirationDate();

    await this.inviteTokenRepository.save({
      token_encrypted,
      expires_at,
      is_used: false,
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

    const key = this.configService.getOrThrow<string>(
      'INVITE_TOKEN_ENCRYPTION_KEY',
    );
    const algorithm = this.configService.getOrThrow<string>(
      'ENCRYPTION_ALGORITHM',
    );
    const invite_token = EncryptionUtil.decrypt(
      storedToken.token_encrypted,
      key,
      algorithm,
    );
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    return {
      invite_url: `${frontendUrl}/register?token=${invite_token}`,
      expires_at: storedToken.expires_at,
    };
  }

  async getInviteTokenHistory(
    offset: number = GLOBAL_ADMIN_CONSTANTS.DEFAULT_PAGINATION_OFFSET,
    limit: number = GLOBAL_ADMIN_CONSTANTS.DEFAULT_PAGINATION_LIMIT,
  ): Promise<InviteHistoryResponseDto> {
    const [tokens, total] = await this.inviteTokenRepository.findAndCount({
      where: { is_used: true },
      relations: ['used_by'],
      order: { created_at: 'DESC' },
      skip: offset,
      take: limit,
    });

    const items: InviteHistoryItemDto[] = [];
    for (const token of tokens) {
      if (token.used_at && token.used_by) {
        items.push({
          created_at: token.created_at,
          expires_at: token.expires_at,
          used_at: token.used_at,
          used_by: token.used_by.email,
        });
      }
    }

    return {
      items,
      total,
      offset,
      limit,
    };
  }

  private async deleteExpiredUnusedTokens(): Promise<void> {
    await this.inviteTokenRepository.delete({
      expires_at: LessThan(new Date()),
      is_used: false,
    });
  }

  private async findActiveToken() {
    return this.inviteTokenRepository.findOne({
      where: {
        is_used: false,
        expires_at: MoreThan(new Date()),
      },
    });
  }

  private createJwtToken(): string {
    const payload: InviteTokenPayload = {
      type: InviteTokenType.ORGANIZATION_ADMIN_INVITE,
      timestamp: Date.now(),
    };

    return this.jwtService.sign(payload, {
      expiresIn: AUTH_CONSTANTS.INVITE_TOKEN_EXPIRES_IN,
    });
  }

  private calculateExpirationDate(): Date {
    return new Date(Date.now() + AUTH_CONSTANTS.INVITE_TOKEN_EXPIRES_IN_MS);
  }

  async getAllOrganizationAdmins(
    offset: number = GLOBAL_ADMIN_CONSTANTS.DEFAULT_PAGINATION_OFFSET,
    limit: number = GLOBAL_ADMIN_CONSTANTS.DEFAULT_PAGINATION_LIMIT,
  ): Promise<OrganizationAdminListResponseDto> {
    const [items, total] = await this.organizationAdminRepository.findAndCount({
      skip: offset,
      take: limit,
      relations: ['organizations'],
      order: { created_at: 'DESC' },
    });

    return {
      items: items.map((admin) => ({
        organization_admin_id: admin.organization_admin_id,
        full_name: admin.full_name,
        email: admin.email,
        phone: admin.phone,
        photo: admin.photo,
        created_at: admin.created_at,
        organizations_count: admin.organizations?.length || 0,
      })),
      total,
      offset,
      limit,
    };
  }

  async deleteOrganizationAdmin(id: number): Promise<void> {
    const admin = await this.organizationAdminRepository.findOne({
      where: { organization_admin_id: id },
    });

    if (!admin) {
      throw new NotFoundException(`Organization Admin with ID ${id} not found`);
    }

    await this.organizationAdminRepository.remove(admin);
  }
}
