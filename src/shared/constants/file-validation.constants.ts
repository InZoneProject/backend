export const FILE_VALIDATION_CONSTANTS = {
  ALLOWED_IMAGE_MIME_TYPES: [
    'image/avif',
    'image/bmp',
    'image/gif',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/svg+xml',
    'image/webp',
  ],
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  UPLOADS_FOLDER_NAME: 'uploads',
  UPLOADS_FOLDER_PATH: './uploads',
  UPLOADS_URL_PREFIX: '/uploads/',
  RANDOM_MAX: 1e9,
  ERROR_MESSAGES: {
    FILE_REQUIRED: 'File is required',
    INVALID_FILE_TYPE: 'Invalid file type. Only image files are allowed',
    FILE_TOO_LARGE: (maxSize: number) =>
      `File size exceeds the maximum allowed size of ${maxSize / 1024 / 1024}MB`,
  },
} as const;
