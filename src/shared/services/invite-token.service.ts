import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository, FindOptionsWhere } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InviteToken } from '../../modules/global-admin/entities/invite-token.entity';
import { InviteTokenType } from '../../modules/global-admin/enums/invite-token-type.enum';
import { InviteResponseDto } from '../../modules/global-admin/dto/invite-response.dto';
import { TokenService } from './token.service';
import { AUTH_CONSTANTS } from '../../modules/auth/auth.constants';
import { EncryptionUtil } from '../utils/encryption.util';
import { JwtService } from '@nestjs/jwt';

interface FindActiveTokenOptions {
  tokenType: InviteTokenType;
  organizationId?: number;
}

interface DeleteExpiredTokensOptions {
  tokenType: InviteTokenType;
  organizationId?: number;
}

interface GenerateInviteTokenOptions {
  tokenType: InviteTokenType;
  organizationId?: number;
  frontendPath: string;
}

@Injectable()
export class InviteTokenService {
  private readonly jwtSecret: string;
  private readonly encryptionKey: string;
  private readonly encryptionAlgorithm: string;

  constructor(
    @InjectRepository(InviteToken)
    private readonly inviteTokenRepository: Repository<InviteToken>,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.encryptionKey = this.configService.getOrThrow<string>(
      'INVITE_TOKEN_ENCRYPTION_KEY',
    );
    this.encryptionAlgorithm = this.configService.getOrThrow<string>(
      'ENCRYPTION_ALGORITHM',
    );
  }

  async generateInviteToken(
    options: GenerateInviteTokenOptions,
  ): Promise<InviteResponseDto> {
    const { tokenType, organizationId, frontendPath } = options;

    const invite_token = this.tokenService.createJwtToken(tokenType);
    const token_encrypted = this.tokenService.encryptToken(invite_token);
    const expires_at = this.tokenService.calculateExpirationDate();

    const tokenData = {
      token_encrypted,
      expires_at,
      is_used: false,
      invite_type: tokenType,
      ...(organizationId !== undefined && {
        organization: { organization_id: organizationId },
      }),
    };

    await this.inviteTokenRepository.save(tokenData);

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    return {
      invite_url: `${frontendUrl}${frontendPath}?token=${invite_token}`,
      expires_at,
    };
  }

  async findActiveToken(
    options: FindActiveTokenOptions,
  ): Promise<InviteToken | null> {
    const { tokenType, organizationId } = options;

    const whereClause: FindOptionsWhere<InviteToken> = {
      is_used: false,
      expires_at: MoreThan(new Date()),
      invite_type: tokenType,
    };

    if (organizationId !== undefined) {
      whereClause.organization = { organization_id: organizationId };
    }

    return this.inviteTokenRepository.findOne({ where: whereClause });
  }

  async deleteExpiredUnusedTokens(
    options: DeleteExpiredTokensOptions,
  ): Promise<void> {
    const { tokenType, organizationId } = options;

    const whereClause: FindOptionsWhere<InviteToken> = {
      expires_at: LessThan(new Date()),
      is_used: false,
      invite_type: tokenType,
    };

    if (organizationId !== undefined) {
      whereClause.organization = { organization_id: organizationId };
    }

    await this.inviteTokenRepository.delete(whereClause);
  }

  getInviteStatus(
    storedToken: InviteToken | null,
    frontendPath: string,
  ): InviteResponseDto | null {
    if (!storedToken) {
      return null;
    }

    const invite_token = this.tokenService.decryptToken(
      storedToken.token_encrypted,
    );
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    return {
      invite_url: `${frontendUrl}${frontendPath}?token=${invite_token}`,
      expires_at: storedToken.expires_at,
    };
  }

  async validateInviteToken(
    token: string,
    expectedType: InviteTokenType,
  ): Promise<InviteToken> {
    let payload: { type: InviteTokenType };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.jwtSecret,
      });
    } catch {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_INVITE_TOKEN,
      );
    }

    if (payload.type !== expectedType) {
      throw new BadRequestException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_INVITE_TOKEN,
      );
    }

    const allActiveTokens = await this.inviteTokenRepository.find({
      where: {
        is_used: false,
        invite_type: expectedType,
        expires_at: MoreThan(new Date()),
      },
      relations: ['organization'],
    });

    for (const storedToken of allActiveTokens) {
      const decrypted = EncryptionUtil.decrypt(
        storedToken.token_encrypted,
        this.encryptionKey,
        this.encryptionAlgorithm,
      );
      if (decrypted === token) {
        return storedToken;
      }
    }

    throw new NotFoundException(
      AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_INVITE_TOKEN,
    );
  }
}
