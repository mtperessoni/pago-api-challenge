import { Video } from '../video/video';

export interface IVideoCache {
  getVideo(filename: string): Promise<Video | null>;
  setVideo(video: Video, ttl?: number): Promise<void>;
  hasVideo(filename: string): Promise<boolean>;
}
