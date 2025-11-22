export const FILE_VALIDATION_CONSTANTS = {
  ALLOWED_IMAGE_TYPE_JPEG: 'image/jpeg',
  ALLOWED_IMAGE_TYPE_PNG: 'image/png',
  ALLOWED_IMAGE_TYPE_JPG: 'image/jpg',
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  UPLOADS_FOLDER_NAME: 'uploads',
  UPLOADS_FOLDER_PATH: './uploads',
  UPLOADS_URL_PREFIX: '/uploads/',
  RANDOM_MAX: 1e9,
  ERROR_MESSAGES: {
    FILE_REQUIRED: 'File is required',
    INVALID_FILE_TYPE:
      'Invalid file type. Only JPEG and PNG images are allowed',
    FILE_TOO_LARGE: (maxSize: number) =>
      `File size exceeds the maximum allowed size of ${maxSize / 1024 / 1024}MB`,
  },
} as const;
