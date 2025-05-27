import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Video } from '../domain/video/video';
import { FileToVideoPipe } from './pipes/file-to-video.pipe';
import { VideoUploadService } from '../use-cases/upload-video/upload-video.service';

@Controller()
export class VideoUploaderController {
  constructor(private readonly videoUploadService: VideoUploadService) {}

  @Post('upload/video')
  @UseInterceptors(FileInterceptor('video', { limits: {} }))
  async uploadVideo(@UploadedFile(FileToVideoPipe) video: Video) {
    await this.videoUploadService.processVideo(video);
    return { message: 'Video uploaded successfully' };
  }
}
