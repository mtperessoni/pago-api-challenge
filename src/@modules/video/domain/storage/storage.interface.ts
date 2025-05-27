export interface FileStats {
  size: number;
  path: string;
  mimetype: string;
}

export interface IStorage {
  save(filename: string, buffer: Buffer): Promise<void>;
  get(filename: string): Promise<Buffer | null>;
  getStats(filename: string): Promise<FileStats | null>;
}
