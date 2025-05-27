import { VideoUploaderModule } from '@/video/video-uploader.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [VideoUploaderModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
