import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { CRYPTO_CONSTANTS } from '../constants/crypto.constants';

@Injectable()
export class TokenHashService {
  generateToken(): string {
    return randomBytes(CRYPTO_CONSTANTS.TOKEN_BYTES).toString(
      CRYPTO_CONSTANTS.TOKEN_ENCODING,
    );
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  compareToken(plainToken: string, hashedToken: string): boolean {
    const hashed = this.hashToken(plainToken);
    return hashed === hashedToken;
  }
}
