import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { VideoUploadService } from './upload-video.service';
import { IVideoCache } from '../../domain/cache/video-cache.interface';
import { IStorage } from '../../domain/storage/storage.interface';
import { Video } from '../../domain/video/video';

const CACHE_TTL = 3600;
describe('VideoUploadService', () => {
  let service: VideoUploadService;
  let mockVideoCache: jest.Mocked<IVideoCache>;
  let mockStorage: jest.Mocked<IStorage>;

  const mockVideo = new Video({
    filename: 'test-video.mp4',
    size: 1024 * 1024,
    mimetype: 'video/mp4',
    buffer: Buffer.from('test video content'),
  });

  beforeEach(async () => {
    mockVideoCache = {
      getVideo: jest.fn(),
      setVideo: jest.fn(),
      hasVideo: jest.fn(),
    };

    mockStorage = {
      save: jest.fn(),
      get: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoUploadService,
        {
          provide: 'VIDEO_CACHE_SERVICE',
          useValue: mockVideoCache,
        },
        {
          provide: 'STORAGE_SERVICE',
          useValue: mockStorage,
        },
      ],
    }).compile();

    service = module.get<VideoUploadService>(VideoUploadService);
  });

  describe('processVideo', () => {
    it('should successfully process a valid video file', async () => {
      const setVideoSpy = jest.spyOn(mockVideoCache, 'setVideo');
      const saveSpy = jest.spyOn(mockStorage, 'save');

      await service.processVideo(mockVideo);

      expect(setVideoSpy).toHaveBeenCalledWith(mockVideo, CACHE_TTL);
      expect(saveSpy).toHaveBeenCalledWith(mockVideo.filename, mockVideo.buffer);
    });

    it('should throw BadRequestException when no video is provided', async () => {
      await expect(service.processVideo(undefined as unknown as Video)).rejects.toThrow(
        new BadRequestException('No video metadata provided'),
      );
    });

    it('should throw BadRequestException when file is not a video', async () => {
      const invalidVideo = new Video({
        ...mockVideo,
        mimetype: 'image/jpeg',
      });

      await expect(service.processVideo(invalidVideo)).rejects.toThrow(
        new BadRequestException('File must be a video'),
      );
    });

    it('should throw BadRequestException when file size exceeds 10MB', async () => {
      const largeVideo = new Video({
        ...mockVideo,
        size: 11 * 1024 * 1024, // 11MB
      });

      await expect(service.processVideo(largeVideo)).rejects.toThrow(
        new BadRequestException('File size must not exceed 10MB'),
      );
    });

    it('should store video with all its properties correctly', async () => {
      const setVideoSpy = jest.spyOn(mockVideoCache, 'setVideo');
      const saveSpy = jest.spyOn(mockStorage, 'save');

      await service.processVideo(mockVideo);

      expect(setVideoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: mockVideo.filename,
          size: mockVideo.size,
          mimetype: mockVideo.mimetype,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          uploadDate: expect.any(String),
          buffer: mockVideo.buffer,
        }),
        CACHE_TTL,
      );

      expect(saveSpy).toHaveBeenCalledWith(mockVideo.filename, mockVideo.buffer);
    });

    it('should handle video with empty buffer', async () => {
      const videoWithEmptyBuffer = new Video({
        ...mockVideo,
        buffer: Buffer.from(''),
      });

      const setVideoSpy = jest.spyOn(mockVideoCache, 'setVideo');
      const saveSpy = jest.spyOn(mockStorage, 'save');

      await service.processVideo(videoWithEmptyBuffer);

      expect(setVideoSpy).toHaveBeenCalledWith(videoWithEmptyBuffer, CACHE_TTL);
      expect(saveSpy).toHaveBeenCalledWith(
        videoWithEmptyBuffer.filename,
        videoWithEmptyBuffer.buffer,
      );
    });

    it('should handle storage save failure', async () => {
      mockStorage.save.mockRejectedValueOnce(new Error('Storage error'));
      const setVideoSpy = jest.spyOn(mockVideoCache, 'setVideo');
      const saveSpy = jest.spyOn(mockStorage, 'save');

      await expect(service.processVideo(mockVideo)).rejects.toThrow('Storage error');

      expect(setVideoSpy).toHaveBeenCalledWith(mockVideo, CACHE_TTL);
      expect(saveSpy).toHaveBeenCalledWith(mockVideo.filename, mockVideo.buffer);
    });

    it('should handle cache set failure', async () => {
      mockVideoCache.setVideo.mockRejectedValueOnce(new Error('Cache error'));
      const setVideoSpy = jest.spyOn(mockVideoCache, 'setVideo');
      const saveSpy = jest.spyOn(mockStorage, 'save');

      await expect(service.processVideo(mockVideo)).rejects.toThrow('Cache error');

      expect(setVideoSpy).toHaveBeenCalledWith(mockVideo, CACHE_TTL);
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should handle concurrent uploads of the same video', async () => {
      const setVideoSpy = jest.spyOn(mockVideoCache, 'setVideo');
      const saveSpy = jest.spyOn(mockStorage, 'save');
      const promises = [service.processVideo(mockVideo), service.processVideo(mockVideo)];

      await Promise.all(promises);

      expect(setVideoSpy).toHaveBeenCalledTimes(2);
      expect(saveSpy).toHaveBeenCalledTimes(2);
    });
  });
});
