/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetVideoService } from './get-video.service';
import { ICache } from '../../domain/cache/cache.interface';
import { IStorage } from '../../domain/storage/storage.interface';
import { Video } from '../../domain/video/video';
import { Readable } from 'stream';

const buffer = Buffer.from('test video content');
jest.mock('fs', () => ({
  createReadStream: jest.fn().mockImplementation(() => {
    return Readable.from(buffer);
  }),
}));

describe('GetVideoService', () => {
  let service: GetVideoService;
  let mockCache: jest.Mocked<ICache>;
  let mockStorage: jest.Mocked<IStorage>;

  const mockVideo = new Video({
    filename: 'test-video.mp4',
    size: buffer.length,
    mimetype: 'video/mp4',
    buffer,
  });

  const mockFileStats = {
    path: '/path/to/video.mp4',
    size: buffer.length,
    mimetype: 'video/mp4',
  };

  beforeEach(async () => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    mockStorage = {
      save: jest.fn(),
      get: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVideoService,
        {
          provide: 'CACHE_SERVICE',
          useValue: mockCache,
        },
        {
          provide: 'STORAGE_SERVICE',
          useValue: mockStorage,
        },
      ],
    }).compile();

    service = module.get<GetVideoService>(GetVideoService);
  });

  describe('getVideo', () => {
    it('should return video stream from cache when video is cached', async () => {
      const cacheGetSpy = jest.spyOn(mockCache, 'get').mockResolvedValueOnce(mockVideo);
      const storageStatsSpy = jest.spyOn(mockStorage, 'getStats');

      const result = await service.getVideo('test-video.mp4');

      expect(result).toEqual({
        stream: expect.any(Readable),
        range: expect.objectContaining({
          start: 0,
          end: mockVideo.size - 1,
          total: mockVideo.size,
        }),
        mimetype: mockVideo.mimetype,
      });
      expect(cacheGetSpy).toHaveBeenCalledWith('video:test-video.mp4');
      expect(storageStatsSpy).not.toHaveBeenCalled();
    });

    it('should return video stream from storage when video is not in cache', async () => {
      const cacheGetSpy = jest.spyOn(mockCache, 'get').mockResolvedValueOnce(null);
      const storageStatsSpy = jest
        .spyOn(mockStorage, 'getStats')
        .mockResolvedValueOnce(mockFileStats);

      const result = await service.getVideo('test-video.mp4');

      expect(result).toEqual({
        stream: expect.any(Readable),
        range: expect.objectContaining({
          start: 0,
          end: mockFileStats.size - 1,
          total: mockFileStats.size,
        }),
        mimetype: mockFileStats.mimetype,
      });
      expect(cacheGetSpy).toHaveBeenCalledWith('video:test-video.mp4');
      expect(storageStatsSpy).toHaveBeenCalledWith('test-video.mp4');
    });

    it('should throw NotFoundException when video is not found in storage', async () => {
      const cachecacheGetSpy = jest.spyOn(mockCache, 'get').mockResolvedValueOnce(null);
      const storageStatsSpy = jest.spyOn(mockStorage, 'getStats').mockResolvedValueOnce(null);

      await expect(service.getVideo('non-existent.mp4')).rejects.toThrow(
        new NotFoundException('Video non-existent.mp4 not found'),
      );
      expect(cachecacheGetSpy).toHaveBeenCalledWith('video:non-existent.mp4');
      expect(storageStatsSpy).toHaveBeenCalledWith('non-existent.mp4');
    });

    it('should handle range requests correctly', async () => {
      mockCache.get.mockResolvedValueOnce(mockVideo);
      const rangeRequest = { start: 0, end: 10 };

      const result = await service.getVideo('test-video.mp4', rangeRequest);

      expect(result).toEqual({
        stream: expect.any(Readable),
        range: expect.objectContaining({
          start: 0,
          end: 10,
          total: mockVideo.size,
        }),
        mimetype: mockVideo.mimetype,
      });
    });

    it('should handle partial range requests (only start)', async () => {
      mockCache.get.mockResolvedValueOnce(mockVideo);
      const rangeRequest = { start: 0 };

      const result = await service.getVideo('test-video.mp4', rangeRequest);

      expect(result).toEqual({
        stream: expect.any(Readable),
        range: expect.objectContaining({
          start: 0,
          end: mockVideo.size - 1,
          total: mockVideo.size,
        }),
        mimetype: mockVideo.mimetype,
      });
    });

    it('should handle partial range requests (only end)', async () => {
      mockCache.get.mockResolvedValueOnce(mockVideo);
      const rangeRequest = { end: 10 };

      const result = await service.getVideo('test-video.mp4', rangeRequest);

      expect(result).toEqual({
        stream: expect.any(Readable),
        range: expect.objectContaining({
          start: 0,
          end: 10,
          total: mockVideo.size,
        }),
        mimetype: mockVideo.mimetype,
      });
    });

    it('should handle invalid buffer in cached video', async () => {
      const invalidVideo = new Video({
        ...mockVideo,
        size: 1000,
        buffer: Buffer.from('invalid'),
      });
      const cachecacheGetSpy = jest.spyOn(mockCache, 'get').mockResolvedValueOnce(invalidVideo);
      const storageStatsSpy = jest
        .spyOn(mockStorage, 'getStats')
        .mockResolvedValueOnce(mockFileStats);

      const result = await service.getVideo('test-video.mp4');

      expect(result).toEqual({
        stream: expect.any(Readable),
        range: expect.objectContaining({
          start: 0,
          end: mockFileStats.size - 1,
          total: mockFileStats.size,
        }),
        mimetype: mockFileStats.mimetype,
      });
      expect(cachecacheGetSpy).toHaveBeenCalledWith('video:test-video.mp4');
      expect(storageStatsSpy).toHaveBeenCalledWith('test-video.mp4');
    });

    it('should handle storage getStats failure', async () => {
      const cachecacheGetSpy = jest.spyOn(mockCache, 'get').mockResolvedValueOnce(null);
      const storageStatsSpy = jest
        .spyOn(mockStorage, 'getStats')
        .mockRejectedValueOnce(new Error('Storage error'));

      await expect(service.getVideo('test-video.mp4')).rejects.toThrow('Storage error');

      expect(cachecacheGetSpy).toHaveBeenCalledWith('video:test-video.mp4');
      expect(storageStatsSpy).toHaveBeenCalledWith('test-video.mp4');
    });
  });
});
