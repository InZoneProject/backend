export const ENCRYPTION_CONSTANTS = {
  ALGORITHM: 'aes-256-cbc',
  IV_LENGTH: 16,
  DELIMITER: ':',
  ENCODING: {
    INPUT: 'utf8' as const,
    OUTPUT: 'hex' as const,
  },
} as const;
