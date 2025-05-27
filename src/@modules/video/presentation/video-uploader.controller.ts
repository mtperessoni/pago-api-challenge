import { Controller, Post, Get, UseInterceptors, UploadedFile, Param, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Video } from '../domain/video/video';
import { GetVideoService } from '../use-cases/get-video/get-video.service';
import { Response } from 'express';
import { FileToVideoPipe } from './pipes/file-to-video.pipe';
import { VideoUploadService } from '../use-cases/upload-video/upload-video.service';
import { RangeHeader } from './decorators/range-header.decorator';
import { ParseRangeHeaderPipe } from './pipes/parse-range-header.pipe';

interface Range {
  start?: number;
  end?: number;
}

@Controller()
export class VideoUploaderController {
  constructor(
    private readonly videoUploadService: VideoUploadService,
    private readonly getVideoService: GetVideoService,
  ) {}

  @Post('upload/video')
  @UseInterceptors(FileInterceptor('video', { limits: {} }))
  async uploadVideo(@UploadedFile(FileToVideoPipe) video: Video) {
    await this.videoUploadService.processVideo(video);
    return { message: 'Video uploaded successfully' };
  }

  @Get('static/video/:filename')
  async streamVideo(
    @Param('filename') filename: string,
    @RangeHeader(new ParseRangeHeaderPipe()) range: Range | undefined,
    @Res() res: Response,
  ) {
    const videoStream = await this.getVideoService.getVideo(filename, range);

    res.set({
      'Content-Type': videoStream.mimetype,
      'Accept-Ranges': 'bytes',
      'Content-Length': videoStream.range.contentLength,
    });

    if (range) {
      res.status(206);
      res.set('Content-Range', videoStream.range.contentRange);
    } else {
      res.status(200);
    }

    videoStream.stream.pipe(res);
  }
}
