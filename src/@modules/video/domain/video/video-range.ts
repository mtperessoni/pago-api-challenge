export class VideoRange {
  private constructor(
    public readonly start: number,
    public readonly end: number,
    public readonly total: number,
  ) {
    if (start < 0 || end < 0 || total <= 0) {
      throw new Error('Range values must be positive');
    }

    if (start > end) {
      throw new Error('Start cannot be greater than end');
    }

    if (end >= total) {
      throw new Error('End cannot be greater than or equal to total');
    }
  }

  static create(start: number, end: number, total: number): VideoRange {
    return new VideoRange(start, end, total);
  }

  get contentLength(): number {
    return this.end - this.start + 1;
  }

  get contentRange(): string {
    return `bytes ${this.start}-${this.end}/${this.total}`;
  }
}
