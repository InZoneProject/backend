import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, error);
    }
  }
}
