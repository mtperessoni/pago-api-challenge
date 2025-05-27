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

  constructor(props: VideoProps) {
    this.filename = props.filename;
    this.size = props.size;
    this.mimetype = props.mimetype;
    this.buffer = props.buffer;
    this.uploadDate = new Date().toISOString();
  }
}
