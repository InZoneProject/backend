import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EncryptionUtil } from '../utils/encryption.util';
import { AUTH_CONSTANTS } from '../../modules/auth/auth.constants';
import { InviteTokenType } from '../../modules/global-admin/enums/invite-token-type.enum';
import { InviteTokenPayload } from '../../modules/global-admin/types/invite-token-payload.types';

@Injectable()
export class TokenService {
  private readonly encryptionKey: string;
  private readonly encryptionAlgorithm: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.encryptionKey = this.configService.getOrThrow<string>(
      'INVITE_TOKEN_ENCRYPTION_KEY',
    );
    this.encryptionAlgorithm = this.configService.getOrThrow<string>(
      'ENCRYPTION_ALGORITHM',
    );
  }

  createJwtToken(type: InviteTokenType): string {
    const payload: InviteTokenPayload = {
      type,
      timestamp: Date.now(),
    };

    return this.jwtService.sign(payload, {
      expiresIn: AUTH_CONSTANTS.INVITE_TOKEN_EXPIRES_IN,
    });
  }

  calculateExpirationDate(): Date {
    return new Date(Date.now() + AUTH_CONSTANTS.INVITE_TOKEN_EXPIRES_IN_MS);
  }

  encryptToken(token: string): string {
    return EncryptionUtil.encrypt(
      token,
      this.encryptionKey,
      this.encryptionAlgorithm,
    );
  }

  decryptToken(encryptedToken: string): string {
    return EncryptionUtil.decrypt(
      encryptedToken,
      this.encryptionKey,
      this.encryptionAlgorithm,
    );
  }
}
