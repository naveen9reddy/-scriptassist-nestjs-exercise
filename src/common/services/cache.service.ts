import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import * as NodeCache from 'node-cache';
import * as util from 'util';

@Injectable()
export class CacheService {
  private cache: NodeCache;
  private redisClient: Redis;
  private readonly logger = new Logger(CacheService.name);
  private readonly namespace: string = 'cache';

  constructor() {
    // Initialize in-memory cache 
    this.cache = new NodeCache({ 
      stdTTL: 300, // Time-to-live (TTL) for each cache item in seconds
      checkperiod: 60, // Period to check and clean expired items
      deleteOnExpire: true // Automatically delete expired items
    });

    this.redisClient = new Redis({
      host: 'localhost',
      port: 6379,
    });
  }    

  // method to validate keys
  private validateKey(key: string): boolean {
    return typeof key === 'string' && key.trim().length > 0;
  }

  // Set a cache item
  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    if (!this.validateKey(key)) {
      this.logger.error(`Invalid cache key: ${key}`);
      throw new Error('Invalid cache key');
    }

    try {
      const serializedValue = JSON.stringify(value); // Serialize object for storage
      const expiresAt = Date.now() + ttlSeconds * 1000;

      // In-memory cache
      this.cache.set(key, { value: serializedValue, expiresAt });

      // Redis cache
      await this.redisClient.setex(`${this.namespace}:${key}`, ttlSeconds, serializedValue);

      this.logger.log(`Cache set for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting cache for key: ${key}`);
      throw new Error('Error setting cache');
    }
  }

  // Get a cache item (from Redis and fallback to in-memory cache)
  async get<T>(key: string): Promise<T | null> {
    if (!this.validateKey(key)) {
      this.logger.error(`Invalid cache key: ${key}`);
      throw new Error('Invalid cache key');
    }

    try {
      // First check Redis
      const redisValue = await this.redisClient.get(`${this.namespace}:${key}`);
      if (redisValue) {
        this.logger.log(`Cache hit in Redis for key: ${key}`);
        return JSON.parse(redisValue) as T; // Deserialize value
      }

      // Fallback to in-memory cache
      const cacheItem = this.cache.get<{ value: string; expiresAt: number }>(key);
      if (cacheItem && cacheItem.expiresAt > Date.now()) {
        this.logger.log(`Cache hit in memory for key: ${key}`);
        return JSON.parse(cacheItem.value) as T; // Deserialize value
      }

      // Cache miss
      this.logger.warn(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting cache for key: ${key}`);
      throw new Error('Error getting cache');
    }
  }

  // Delete a cache item (both Redis and in-memory cache)
  async delete(key: string): Promise<boolean> {
    if (!this.validateKey(key)) {
      this.logger.error(`Invalid cache key: ${key}`);
      throw new Error('Invalid cache key');
    }

    try {
      // In-memory cache
      const inMemoryDeleted = this.cache.del(key);

      // Redis cache
      const redisDeleted = await this.redisClient.del(`${this.namespace}:${key}`);

     
      if (inMemoryDeleted || redisDeleted) {
        this.logger.log(`Cache deleted for key: ${key}`);
        return true;
      }

      this.logger.warn(`Cache not found for deletion: ${key}`);
      return false;
    } catch (error) {
      this.logger.error(`Error deleting cache for key: ${key}`, );
      throw new Error('Error deleting cache');
    }
  }

  // Clear the entire cache 
  async clear(): Promise<void> {
    try {
      // In-memory cache clear
      this.cache.flushAll();

      // Redis cache clear
      await this.redisClient.flushdb();

      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.error('Error clearing cache');
      throw new Error('Error clearing cache');
    }
  }

  // Check if a cache item exists 
  async has(key: string): Promise<boolean> {
    if (!this.validateKey(key)) {
      this.logger.error(`Invalid cache key: ${key}`);
      throw new Error('Invalid cache key');
    }

    try {
      // Check Redis
      const redisExists = await this.redisClient.exists(`${this.namespace}:${key}`);
      if (redisExists) {
        this.logger.log(`Cache exists in Redis for key: ${key}`);
        return true;
      }

      // Check in-memory cache
      const cacheItem = this.cache.get<{ value: string; expiresAt: number }>(key);
      if (cacheItem && cacheItem.expiresAt > Date.now()) {
        this.logger.log(`Cache exists in memory for key: ${key}`);
        return true;
      }

      this.logger.warn(`Cache not found for key: ${key}`);
      return false;
    } catch (error) {
      this.logger.error(`Error checking cache existence for key: ${key}`);
      throw new Error('Error checking cache existence');
    }
  }

  // Background cleanup task for expired cache entries
  private async cleanupExpired(): Promise<void> {
    try {
      const keys = this.cache.keys();
      for (const key of keys) {
        this.cache.get(key); // Triggers TTL check and removes if expired
      }
    } catch (err) {
      this.logger.error('Cache cleanup error:', err);
    }
  }
  

  // Get cache statistics
  async stats(): Promise<any> {
    try {
      const inMemoryStats = this.cache.getStats();
      const redisInfo = await this.redisClient.info('memory');

      return {
        inMemoryStats,
        redisInfo,
      };
    } catch (error) {
      this.logger.error('Error fetching cache stats');
      throw new Error('Error fetching cache stats');
    }
  }
}
