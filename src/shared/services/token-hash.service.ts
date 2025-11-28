import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class TokenHashService {
  generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  compareToken(plainToken: string, hashedToken: string): boolean {
    const hashed = this.hashToken(plainToken);
    return hashed === hashedToken;
  }
}
