export interface VideoProps {
  filename: string;
  size: number;
  mimetype: string;
  buffer: Buffer;
}

export class Video {
  public readonly filename: string;
  public readonly size: number;
  public readonly mimetype: string;
  public readonly buffer: Buffer;
  public readonly uploadDate: string;

  constructor({ filename, size, mimetype, buffer }: VideoProps) {
    this.filename = filename;
    this.size = size;
    this.mimetype = mimetype;
    this.buffer = buffer;
    this.uploadDate = new Date().toISOString();
  }
}
