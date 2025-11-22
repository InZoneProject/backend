import { Injectable, BadRequestException } from '@nestjs/common';
import { FILE_VALIDATION_CONSTANTS } from '../constants/file-validation.constants';

@Injectable()
export class FileValidator {
  validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException(
        FILE_VALIDATION_CONSTANTS.ERROR_MESSAGES.FILE_REQUIRED,
      );
    }

    const isValidType =
      file.mimetype === FILE_VALIDATION_CONSTANTS.ALLOWED_IMAGE_TYPE_JPEG ||
      file.mimetype === FILE_VALIDATION_CONSTANTS.ALLOWED_IMAGE_TYPE_PNG ||
      file.mimetype === FILE_VALIDATION_CONSTANTS.ALLOWED_IMAGE_TYPE_JPG;

    if (!isValidType) {
      throw new BadRequestException(
        FILE_VALIDATION_CONSTANTS.ERROR_MESSAGES.INVALID_FILE_TYPE,
      );
    }

    if (file.size > FILE_VALIDATION_CONSTANTS.MAX_FILE_SIZE) {
      throw new BadRequestException(
        FILE_VALIDATION_CONSTANTS.ERROR_MESSAGES.FILE_TOO_LARGE(
          FILE_VALIDATION_CONSTANTS.MAX_FILE_SIZE,
        ),
      );
    }
  }
}
