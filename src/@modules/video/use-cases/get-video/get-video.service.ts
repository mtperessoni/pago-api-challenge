import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ICache } from '../../domain/cache/cache.interface';
import { IStorage } from '../../domain/storage/storage.interface';
import { Video } from '../../domain/video/video';
import { VideoRange } from '../../domain/video/video-range';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

interface RangeRequest {
  start?: number;
  end?: number;
}

interface VideoStreamResponse {
  stream: Readable;
  range: VideoRange;
  mimetype: string;
}

@Injectable()
export class GetVideoService {
  constructor(
    @Inject('CACHE_SERVICE')
    private readonly cache: ICache,
    @Inject('STORAGE_SERVICE')
    private readonly storage: IStorage,
  ) {}

  async getVideo(filename: string, rangeRequest?: RangeRequest): Promise<VideoStreamResponse> {
    const cachedVideo = await this.cache.get<Video>(`video:${filename}`);

    if (cachedVideo) {
      const video =
        typeof cachedVideo.buffer === 'string'
          ? new Video({
              filename: cachedVideo.filename,
              size: cachedVideo.size,
              mimetype: cachedVideo.mimetype,
              buffer: Buffer.from(cachedVideo.buffer),
            })
          : cachedVideo;

      if (this.hasValidBuffer(video)) {
        return this.streamFromCache(video, rangeRequest);
      }
    }
    return this.streamFromStorage(filename, rangeRequest);
  }

  private hasValidBuffer(video: Video): boolean {
    return !!video.buffer && video.buffer.length === video.size;
  }

  private createVideoRange(rangeRequest: RangeRequest | undefined, total: number): VideoRange {
    return VideoRange.create(rangeRequest?.start || 0, rangeRequest?.end || total - 1, total);
  }

  private streamFromCache(video: Video, rangeRequest?: RangeRequest): VideoStreamResponse {
    const videoRange = this.createVideoRange(rangeRequest, video.size);
    const slicedBuffer = video.buffer.subarray(videoRange.start, videoRange.end + 1);
    const stream = Readable.from(slicedBuffer);

    return {
      stream,
      range: videoRange,
      mimetype: video.mimetype,
    };
  }

  private async streamFromStorage(
    filename: string,
    rangeRequest?: RangeRequest,
  ): Promise<VideoStreamResponse> {
    const fileStats = await this.storage.getStats(filename);

    if (!fileStats) {
      throw new NotFoundException(`Video ${filename} not found`);
    }

    const videoRange = this.createVideoRange(rangeRequest, fileStats.size);
    const stream = createReadStream(fileStats.path, {
      start: videoRange.start,
      end: videoRange.end,
    });

    return {
      stream,
      range: videoRange,
      mimetype: fileStats.mimetype,
    };
  }
}
