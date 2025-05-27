import { Module } from '@nestjs/common';
import { VideoUploadService } from './use-cases/upload-video/upload-video.service';
import { RedisCache } from './infra/cache/redis.cache';
import { LocalStorage } from './infra/storage/local.storage';
import { MulterModule } from '@nestjs/platform-express';
import { VideoUploaderController } from './presentation/video-uploader.controller';
import { GetVideoService } from './use-cases/get-video/get-video.service';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  ],
  controllers: [VideoUploaderController],
  providers: [
    VideoUploadService,
    GetVideoService,
    {
      provide: 'CACHE_SERVICE',
      useClass: RedisCache,
    },
    {
      provide: 'STORAGE_SERVICE',
      useFactory: async () => {
        const storage = new LocalStorage();
        await storage.init();
        return storage;
      },
    },
  ],
})
export class VideoUploaderModule {}
