export const AUTH_CONSTANTS = {
  BCRYPT_ROUNDS: 10,
  INVITE_TOKEN_EXPIRES_IN_MS: 24 * 60 * 60 * 1000,
  VERIFICATION_CODE_EXPIRES_IN_MS: 10 * 60 * 1000,
  PASSWORD_RESET_EXPIRES_IN_MS: 10 * 60 * 1000,
  VERIFICATION_CODE_LENGTH: 6,
  ERROR_MESSAGES: {
    EMPLOYEE_NOT_FOUND: 'Employee with this email not found',
    ORGANIZATION_ADMIN_NOT_FOUND:
      'Organization admin with this email not found',
    TAG_ADMIN_NOT_FOUND: 'Tag admin with this email not found',
    PASSWORD_RESET_LINK_ALREADY_ACTIVE: 'Password reset link is already active',
    INVALID_CREDENTIALS: 'Invalid credentials',
    MISSING_ENV_VARIABLES:
      'GLOBAL_ADMIN_EMAIL and GLOBAL_ADMIN_PASSWORD must be set in environment variables',
    INVALID_INVITE_TOKEN: 'Invalid or expired invite token',
    INVALID_RESET_TOKEN: 'Invalid or expired password reset token',
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
    VERIFICATION_CODE_ALREADY_SENT:
      'Verification code has already been sent. Please wait before requesting a new one',
  },
} as const;
