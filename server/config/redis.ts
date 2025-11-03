import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { envs } from './envs';

// Create a singleton Redis client instance
export const redisClient = new Redis(envs.REDIS_URL, {
  // Recommended options for production
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redisClient.on('connect', () => {
  logger.info('Successfully connected to Redis!');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
  // Consider exiting the process if Redis is critical to your app's function
  // process.exit(1);
});
