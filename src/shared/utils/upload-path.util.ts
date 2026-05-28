import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { FILE_VALIDATION_CONSTANTS } from '../constants/file-validation.constants';

export function getUploadsFolderPath(): string {
  return resolve(
    process.env.UPLOADS_DIR ||
      process.env.UPLOADS_FOLDER_PATH ||
      FILE_VALIDATION_CONSTANTS.UPLOADS_FOLDER_PATH,
  );
}

export function ensureUploadsFolderExists(): string {
  const uploadsFolderPath = getUploadsFolderPath();
  mkdirSync(uploadsFolderPath, { recursive: true });
  return uploadsFolderPath;
}
