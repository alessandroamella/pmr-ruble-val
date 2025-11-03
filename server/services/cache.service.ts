import type { Redis } from 'ioredis';
import { envs } from 'server/config/envs';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * An interface defining the contract for a cache service.
 * This allows for easy swapping of cache implementations (e.g., Redis, in-memory).
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlInSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

/**
 * A Redis-backed implementation of the ICacheService.
 */
class RedisCacheService implements ICacheService {
  private client: Redis;
  private keyPrefix: string;

  constructor(client: Redis) {
    this.client = client;
    this.keyPrefix = envs.REDIS_KEY_PREFIX;
  }

  /**
   * Adds the configured prefix to the key.
   */
  private getPrefixedKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      const data = await this.client.get(prefixedKey);
      if (data) {
        // Redis stores everything as strings, so we need to parse it back
        return JSON.parse(data) as T;
      }
    } catch (error) {
      logger.error(`Error getting data from Redis for key "${key}":`, error);
    }
    return null;
  }

  async set<T>(key: string, value: T, ttlInSeconds?: number): Promise<void> {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      // Stringify the object before storing it in Redis
      const stringifiedValue = JSON.stringify(value);

      if (ttlInSeconds) {
        // 'EX' sets the expiration in seconds
        await this.client.set(
          prefixedKey,
          stringifiedValue,
          'EX',
          ttlInSeconds,
        );
      } else {
        await this.client.set(prefixedKey, stringifiedValue);
      }
    } catch (error) {
      logger.error(`Error setting data in Redis for key "${key}":`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      const prefixedKey = this.getPrefixedKey(key);
      await this.client.del(prefixedKey);
    } catch (error) {
      logger.error(`Error deleting key "${key}" from Redis:`, error);
    }
  }
}

// Create and export a singleton instance of the service
export const redisCacheService = new RedisCacheService(redisClient);
