import { Test, TestingModule } from '@nestjs/testing';
import { LocalStorage } from './local.storage';
import { access, mkdir, writeFile, readFile, stat } from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  stat: jest.fn(),
}));

jest.mock('mime-types', () => ({
  lookup: jest.fn().mockReturnValue('video/mp4'),
}));

describe('LocalStorage Service', () => {
  let storage: LocalStorage;
  const mockUploadDir = '/test/upload/dir';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalStorage],
    }).compile();

    storage = module.get<LocalStorage>(LocalStorage);
  });

  describe('Storage Directory Configuration', () => {
    it('should use default upload directory (./uploads) when UPLOAD_DIR environment variable is not set', () => {
      const defaultDir = path.join(process.cwd(), 'uploads');
      expect(storage['uploadDir']).toBe(defaultDir);
    });

    it('should use custom upload directory from UPLOAD_DIR environment variable when provided', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        UPLOAD_DIR: mockUploadDir,
      };

      const customStorage = new LocalStorage();
      expect(customStorage['uploadDir']).toBe(mockUploadDir);

      process.env = originalEnv;
    });
  });

  describe('Storage Directory Initialization', () => {
    it('should skip directory creation when upload directory already exists', async () => {
      (access as jest.Mock).mockResolvedValueOnce(undefined);

      await storage.init();

      expect(access).toHaveBeenCalledWith(storage['uploadDir']);
      expect(mkdir).not.toHaveBeenCalled();
    });

    it('should create upload directory with recursive option when it does not exist', async () => {
      (access as jest.Mock).mockRejectedValueOnce(new Error('Directory not found'));

      await storage.init();

      expect(access).toHaveBeenCalledWith(storage['uploadDir']);
      expect(mkdir).toHaveBeenCalledWith(storage['uploadDir'], { recursive: true });
    });
  });

  describe('File Storage Operations', () => {
    describe('Saving Files', () => {
      it('should successfully write file buffer to the specified path in upload directory', async () => {
        const filename = 'test.mp4';
        const buffer = Buffer.from('test data');

        await storage.save(filename, buffer);

        expect(writeFile).toHaveBeenCalledWith(path.join(storage['uploadDir'], filename), buffer);
      });
    });

    describe('Retrieving Files', () => {
      it('should return file buffer when requested file exists in storage', async () => {
        const filename = 'test.mp4';
        const mockBuffer = Buffer.from('test data');
        (readFile as jest.Mock).mockResolvedValueOnce(mockBuffer);

        const result = await storage.get(filename);

        expect(readFile).toHaveBeenCalledWith(path.join(storage['uploadDir'], filename));
        expect(result).toEqual(mockBuffer);
      });

      it('should return null when attempting to retrieve a non-existent file', async () => {
        const filename = 'nonexistent.mp4';
        (readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));

        const result = await storage.get(filename);

        expect(readFile).toHaveBeenCalledWith(path.join(storage['uploadDir'], filename));
        expect(result).toBeNull();
      });
    });

    describe('File Statistics', () => {
      it('should return complete file metadata (size, path, mimetype) for existing files', async () => {
        const filename = 'test.mp4';
        const mockStats = {
          size: 1024,
          isFile: () => true,
        };
        (stat as jest.Mock).mockResolvedValueOnce(mockStats);

        const result = await storage.getStats(filename);

        expect(stat).toHaveBeenCalledWith(path.join(storage['uploadDir'], filename));
        expect(result).toEqual({
          size: 1024,
          path: path.join(storage['uploadDir'], filename),
          mimetype: 'video/mp4',
        });
      });

      it('should return null when attempting to get stats for a non-existent file', async () => {
        const filename = 'nonexistent.mp4';
        (stat as jest.Mock).mockRejectedValueOnce(new Error('File not found'));

        const result = await storage.getStats(filename);

        expect(stat).toHaveBeenCalledWith(path.join(storage['uploadDir'], filename));
        expect(result).toBeNull();
      });
    });
  });
});
