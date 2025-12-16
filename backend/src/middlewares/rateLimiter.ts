import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { rateLimitStore } from '../config/redis.js';
import { RateLimitError } from './errorHandler.js';
import { logger } from '../utils/logger.js';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req: Request) => req.ip || 'unknown',
    message = 'Demasiadas solicitudes, intente de nuevo más tarde',
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const current = await rateLimitStore.increment(key, windowMs);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

      if (current > maxRequests) {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          current,
          limit: maxRequests,
        });
        throw new RateLimitError(message);
      }

      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        next(error);
      } else {
        // If Redis fails, allow request to proceed
        logger.error('Rate limiter error', { error });
        next();
      }
    }
  };
}

// General rate limiter for all routes
export const rateLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.maxRequests,
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: config.rateLimit.authMaxRequests,
  keyGenerator: (req: Request) => `auth:${req.ip}`,
  message: 'Demasiados intentos de autenticación, intente de nuevo en 15 minutos',
});

// Rate limiter for password reset
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  keyGenerator: (req: Request) => `reset:${req.ip}`,
  message: 'Demasiadas solicitudes de recuperación de contraseña',
});

// Rate limiter for file uploads
export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50,
  keyGenerator: (req: Request) => `upload:${req.ip}`,
  message: 'Demasiadas cargas de archivos',
});
