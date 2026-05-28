import { diskStorage } from 'multer';
import { extname } from 'path';
import { FILE_VALIDATION_CONSTANTS } from '../constants/file-validation.constants';
import { ensureUploadsFolderExists } from '../utils/upload-path.util';

export const multerConfig = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, ensureUploadsFolderExists());
    },
    filename: (_req, file, callback) => {
      const uniqueSuffix =
        Date.now() +
        '-' +
        Math.round(Math.random() * FILE_VALIDATION_CONSTANTS.RANDOM_MAX);
      const ext =
        extname(file.originalname) || mimeTypeToExtension(file.mimetype);
      const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
};

function mimeTypeToExtension(mimeType: string): string {
  return (
    FILE_VALIDATION_CONSTANTS.MIME_TYPE_EXTENSIONS[
      mimeType as keyof typeof FILE_VALIDATION_CONSTANTS.MIME_TYPE_EXTENSIONS
    ] ?? ''
  );
}
