import { Test, TestingModule } from '@nestjs/testing';
import { RedisCache } from './redis.cache';
import Redis from 'ioredis';

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockSetex = jest.fn();
const mockExists = jest.fn();

jest.mock('ioredis', () => {
  const mock = jest.fn().mockImplementation(() => ({
    get: mockGet,
    set: mockSet,
    setex: mockSetex,
    exists: mockExists,
  }));
  return {
    default: mock,
    Redis: mock,
  };
});

describe('RedisCache', () => {
  let cache: RedisCache;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisCache],
    }).compile();

    cache = module.get<RedisCache>(RedisCache);
  });

  describe('Redis Connection Configuration', () => {
    it('should initialize Redis with default host and port when environment variables are not set', () => {
      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
      });
    });

    it('should initialize Redis with custom host and port from environment variables', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        REDIS_HOST: 'test-host',
        REDIS_PORT: '6380',
      };

      new RedisCache();

      expect(Redis).toHaveBeenCalledWith({
        host: 'test-host',
        port: 6380,
      });
    });
  });

  describe('Cache Retrieval (get method)', () => {
    it('should successfully retrieve and parse JSON data from cache', async () => {
      const testData = { test: 'data' };
      mockGet.mockResolvedValueOnce(JSON.stringify(testData));

      const result = await cache.get('test-key');

      expect(mockGet).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(testData);
    });

    it('should return null when attempting to retrieve a non-existent cache key', async () => {
      mockGet.mockResolvedValueOnce(null);

      const result = await cache.get('non-existent-key');

      expect(mockGet).toHaveBeenCalledWith('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully by returning null', async () => {
      mockGet.mockRejectedValueOnce(new Error('Redis error'));

      const result = await cache.get('test-key');

      expect(mockGet).toHaveBeenCalledWith('test-key');
      expect(result).toBeNull();
    });
  });

  describe('Cache Storage (set method)', () => {
    it('should store data in cache without expiration time', async () => {
      const testData = { test: 'data' };

      await cache.set('test-key', testData);

      expect(mockSet).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
      expect(mockSetex).not.toHaveBeenCalled();
    });

    it('should store data in cache with specified expiration time (TTL)', async () => {
      const testData = { test: 'data' };
      const ttl = 3600;

      await cache.set('test-key', testData, ttl);

      expect(mockSetex).toHaveBeenCalledWith('test-key', ttl, JSON.stringify(testData));
      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  describe('Cache Key Existence Check (exists method)', () => {
    it('should return true when checking an existing cache key', async () => {
      mockExists.mockResolvedValueOnce(1);

      const result = await cache.exists('test-key');

      expect(mockExists).toHaveBeenCalledWith('test-key');
      expect(result).toBe(true);
    });

    it('should return false when checking a non-existent cache key', async () => {
      mockExists.mockResolvedValueOnce(0);

      const result = await cache.exists('non-existent-key');

      expect(mockExists).toHaveBeenCalledWith('non-existent-key');
      expect(result).toBe(false);
    });
  });
});
