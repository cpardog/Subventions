import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { AppError } from './errorHandler.js';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = '_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate a secure CSRF token
function generateToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// Hash token for comparison (prevents timing attacks)
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Routes that should skip CSRF (public auth routes)
const CSRF_SKIP_ROUTES = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

// CSRF Protection Middleware
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    // Ensure token exists in cookie for subsequent requests
    if (!req.cookies[CSRF_COOKIE_NAME]) {
      const token = generateToken();
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }
    return next();
  }

  // Skip CSRF for public auth routes
  if (CSRF_SKIP_ROUTES.includes(req.path)) {
    return next();
  }

  // For unsafe methods, validate CSRF token
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return next(new AppError('Token CSRF faltante', 403, 'CSRF_TOKEN_MISSING'));
  }

  // Compare hashed tokens to prevent timing attacks
  const cookieHash = hashToken(cookieToken);
  const headerHash = hashToken(headerToken);

  if (!crypto.timingSafeEqual(Buffer.from(cookieHash), Buffer.from(headerHash))) {
    return next(new AppError('Token CSRF inválido', 403, 'CSRF_TOKEN_INVALID'));
  }

  next();
}

// Endpoint to get CSRF token for SPA
export function csrfToken(req: Request, res: Response): void {
  let token = req.cookies[CSRF_COOKIE_NAME];

  if (!token) {
    token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  res.json({ csrfToken: token });
}
