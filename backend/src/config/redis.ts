import Redis from 'ioredis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error('Redis error', { error: err.message });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

// Session management helpers
export const sessionStore = {
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await redis.setex(`session:${key}`, ttlSeconds, value);
  },

  async get(key: string): Promise<string | null> {
    return redis.get(`session:${key}`);
  },

  async delete(key: string): Promise<void> {
    await redis.del(`session:${key}`);
  },

  async deleteAllUserSessions(userId: string): Promise<void> {
    const keys = await redis.keys(`session:*:${userId}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

// Rate limiting helpers
export const rateLimitStore = {
  async increment(key: string, windowMs: number): Promise<number> {
    const current = await redis.incr(`ratelimit:${key}`);
    if (current === 1) {
      await redis.pexpire(`ratelimit:${key}`, windowMs);
    }
    return current;
  },

  async get(key: string): Promise<number> {
    const value = await redis.get(`ratelimit:${key}`);
    return value ? parseInt(value, 10) : 0;
  },

  async reset(key: string): Promise<void> {
    await redis.del(`ratelimit:${key}`);
  },
};

// Token blacklist for logout
export const tokenBlacklist = {
  async add(token: string, ttlSeconds: number): Promise<void> {
    await redis.setex(`blacklist:${token}`, ttlSeconds, '1');
  },

  async isBlacklisted(token: string): Promise<boolean> {
    const result = await redis.get(`blacklist:${token}`);
    return result === '1';
  },
};
