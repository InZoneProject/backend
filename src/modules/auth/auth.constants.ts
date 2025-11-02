export const AUTH_CONSTANTS = {
  BCRYPT_ROUNDS: 10,
  INVITE_TOKEN_EXPIRES_IN: '24h' as const,
  INVITE_TOKEN_EXPIRES_IN_MS: 24 * 60 * 60 * 1000,
  ERROR_MESSAGES: {
    INVALID_CREDENTIALS: 'Invalid credentials',
    MISSING_ENV_VARIABLES:
      'GLOBAL_ADMIN_EMAIL and GLOBAL_ADMIN_PASSWORD must be set in environment variables',
    INVALID_INVITE_TOKEN: 'Invalid or expired invite token',
    INVITE_TOKEN_ALREADY_USED: 'This invite token has already been used',
    ACTIVE_INVITE_TOKEN_EXISTS: 'An active invite token already exists.',
  },
} as const;
