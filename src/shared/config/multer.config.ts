import { diskStorage } from 'multer';
import { extname } from 'path';
import { FILE_VALIDATION_CONSTANTS } from '../constants/file-validation.constants';

export const multerConfig = {
  storage: diskStorage({
    destination: FILE_VALIDATION_CONSTANTS.UPLOADS_FOLDER_PATH,
    filename: (_req, file, callback) => {
      const uniqueSuffix =
        Date.now() +
        '-' +
        Math.round(Math.random() * FILE_VALIDATION_CONSTANTS.RANDOM_MAX);
      const ext = extname(file.originalname);
      const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
};
