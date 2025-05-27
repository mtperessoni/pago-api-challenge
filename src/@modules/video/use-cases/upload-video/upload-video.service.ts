import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ICache } from '../../domain/cache/cache.interface';
import { IStorage } from '../../domain/storage/storage.interface';
import { Video } from '../../domain/video/video';

@Injectable()
export class VideoUploadService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  constructor(
    @Inject('CACHE_SERVICE')
    private readonly cache: ICache,
    @Inject('STORAGE_SERVICE')
    private readonly storage: IStorage,
  ) {}

  private validateVideo(video: Video): void {
    if (!video) {
      throw new BadRequestException('No video metadata provided');
    }

    if (!video.mimetype.startsWith('video/')) {
      throw new BadRequestException('File must be a video');
    }

    if (video.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('File size must not exceed 10MB');
    }
  }

  async processVideo(video: Video, ttl: number = this.CACHE_TTL): Promise<void> {
    this.validateVideo(video);

    await this.cache.set<Video>(`video:${video.filename}`, video, ttl);

    if (video.buffer) {
      await this.storage.save(video.filename, video.buffer);
    }
  }
}
