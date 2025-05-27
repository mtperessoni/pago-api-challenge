import { Injectable, Inject } from '@nestjs/common';
import { ICache } from '../../domain/cache/cache.interface';
import { IVideoCache } from '../../domain/cache/video-cache.interface';
import { Video } from '../../domain/video/video';

@Injectable()
export class VideoCacheAdapter implements IVideoCache {
  constructor(
    @Inject('CACHE_SERVICE')
    private readonly cache: ICache,
  ) {}

  private getKey(filename: string): string {
    return `video:${filename}`;
  }

  async getVideo(filename: string): Promise<Video | null> {
    const cachedVideo = await this.cache.get<Video>(this.getKey(filename));

    if (!cachedVideo) {
      return null;
    }

    if (typeof cachedVideo.buffer === 'string') {
      return new Video({
        ...cachedVideo,
        buffer: Buffer.from(cachedVideo.buffer),
      });
    }

    return new Video(cachedVideo);
  }

  async setVideo(video: Video, ttl?: number): Promise<void> {
    await this.cache.set<Video>(this.getKey(video.filename), video, ttl);
  }

  async hasVideo(filename: string): Promise<boolean> {
    return this.cache.exists(this.getKey(filename));
  }
}
