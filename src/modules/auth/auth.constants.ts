export const AUTH_CONSTANTS = {
  BCRYPT_ROUNDS: 10,
  INVITE_TOKEN_EXPIRES_IN: '24h' as const,
  INVITE_TOKEN_EXPIRES_IN_MS: 24 * 60 * 60 * 1000,
  VERIFICATION_CODE_EXPIRES_IN_MS: 10 * 60 * 1000,
  VERIFICATION_CODE_LENGTH: 6,
  VERIFICATION_CODE_RETRY_DELAY_MS: 60 * 1000,
  ERROR_MESSAGES: {
    INVALID_CREDENTIALS: 'Invalid credentials',
    MISSING_ENV_VARIABLES:
      'GLOBAL_ADMIN_EMAIL and GLOBAL_ADMIN_PASSWORD must be set in environment variables',
    INVALID_INVITE_TOKEN: 'Invalid or expired invite token',
    INVITE_TOKEN_ALREADY_USED: 'This invite token has already been used',
    ACTIVE_INVITE_TOKEN_EXISTS: 'An active invite token already exists.',
    EMAIL_ALREADY_IN_USE: 'Email already in use',
    ACCESS_DENIED: 'Access denied',
    EMAIL_NOT_VERIFIED: 'Email not verified',
    EMAIL_ALREADY_VERIFIED: 'Email is already verified',
    INVALID_VERIFICATION_CODE: 'Invalid verification code',
    VERIFICATION_CODE_EXPIRED: 'Verification code has expired',
    GLOBAL_ADMIN_NO_VERIFICATION:
      'Global admin does not need email verification',
  },
} as const;
