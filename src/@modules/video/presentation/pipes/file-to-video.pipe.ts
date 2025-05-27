import { BadRequestException, PipeTransform } from '@nestjs/common';
import { Video } from '../../domain/video/video';

export class FileToVideoPipe implements PipeTransform {
  transform(file: Express.Multer.File): Video {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return new Video({
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      buffer: file.buffer,
    });
  }
}
