import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

export interface Range {
  start?: number;
  end?: number;
}

@Injectable()
export class ParseRangeHeaderPipe implements PipeTransform<string | undefined, Range | undefined> {
  transform(range: string | undefined): Range | undefined {
    if (!range) return undefined;

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);

    if (!match) {
      throw new BadRequestException('Invalid Range format');
    }

    const start = match[1] ? parseInt(match[1], 10) : undefined;
    const end = match[2] ? parseInt(match[2], 10) : undefined;

    if ((start !== undefined && isNaN(start)) || (end !== undefined && isNaN(end))) {
      throw new BadRequestException('Invalid Range values');
    }

    return { start, end };
  }
}
