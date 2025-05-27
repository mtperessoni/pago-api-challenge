import { Injectable, Logger } from '@nestjs/common';
import { FileStats, IStorage } from '../../domain/storage/storage.interface';
import { lookup as mimeLookup } from 'mime-types';
import { access, mkdir, writeFile, readFile, stat } from 'fs/promises';
import * as path from 'path';

@Injectable()
export class LocalStorage implements IStorage {
  private readonly uploadDir: string;
  private readonly logger = new Logger(LocalStorage.name);

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  }

  async init(): Promise<void> {
    try {
      await access(this.uploadDir);
    } catch {
      this.logger.log(`Upload directory "${this.uploadDir}" does not exist. Creating...`);
      await mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Upload directory "${this.uploadDir}" created.`);
    }
  }

  async save(filename: string, buffer: Buffer): Promise<void> {
    const filePath = this.getFilePath(filename);
    await writeFile(filePath, buffer);
  }

  async get(filename: string): Promise<Buffer | null> {
    try {
      const filePath = this.getFilePath(filename);
      return await readFile(filePath);
    } catch {
      this.logger.warn(`File not found or unreadable: ${filename}`);
      return null;
    }
  }

  async getStats(filename: string): Promise<FileStats | null> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      const stats = await stat(filePath);
      const mimetype = mimeLookup(filePath) || 'application/octet-stream';

      return {
        size: stats.size,
        path: filePath,
        mimetype,
      };
    } catch {
      return null;
    }
  }
  private getFilePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }
}
