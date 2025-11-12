import * as crypto from 'crypto';
import { ENCRYPTION_CONSTANTS } from '../constants/encryption.constants';

export class EncryptionUtil {
  static encrypt(token: string, key: string, algorithm: string): string {
    const keyBuffer = Buffer.from(key, ENCRYPTION_CONSTANTS.ENCODING.OUTPUT);
    const iv = crypto.randomBytes(ENCRYPTION_CONSTANTS.IV_LENGTH);
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);

    let encrypted = cipher.update(
      token,
      ENCRYPTION_CONSTANTS.ENCODING.INPUT,
      ENCRYPTION_CONSTANTS.ENCODING.OUTPUT,
    );
    encrypted += cipher.final(ENCRYPTION_CONSTANTS.ENCODING.OUTPUT);

    return (
      iv.toString(ENCRYPTION_CONSTANTS.ENCODING.OUTPUT) +
      ENCRYPTION_CONSTANTS.DELIMITER +
      encrypted
    );
  }

  static decrypt(encrypted: string, key: string, algorithm: string): string {
    const keyBuffer = Buffer.from(key, ENCRYPTION_CONSTANTS.ENCODING.OUTPUT);
    const parts = encrypted.split(ENCRYPTION_CONSTANTS.DELIMITER);

    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], ENCRYPTION_CONSTANTS.ENCODING.OUTPUT);
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);

    let decrypted = decipher.update(
      parts[1],
      ENCRYPTION_CONSTANTS.ENCODING.OUTPUT,
      ENCRYPTION_CONSTANTS.ENCODING.INPUT,
    );
    decrypted += decipher.final(ENCRYPTION_CONSTANTS.ENCODING.INPUT);

    return decrypted;
  }
}
