import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>) {
    super('Error de validación', 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Acceso denegado') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso') {
    super(`${resource} no encontrado`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflicto de datos') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Demasiadas solicitudes') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// Error handler middleware
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default values
  let statusCode = 500;
  let message = 'Error interno del servidor';
  let code = 'INTERNAL_ERROR';
  let errors: Record<string, string[]> | undefined;
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || code;
    isOperational = err.isOperational;

    if (err instanceof ValidationError) {
      errors = err.errors;
    }
  }

  // Log error
  const logData = {
    error: {
      message: err.message,
      stack: err.stack,
      code,
    },
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId: (req as Request & { user?: { id: string } }).user?.id,
    },
  };

  // Debug: log to console as well
  console.error('ERROR:', err.message, err.stack);
  
  if (isOperational) {
    logger.warn('Operational error', logData);
  } else {
    logger.error('Unexpected error', logData);
  }

  // Send response
  const response: {
    success: false;
    error: {
      code: string;
      message: string;
      errors?: Record<string, string[]>;
    };
  } = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (errors) {
    response.error.errors = errors;
  }

  res.status(statusCode).json(response);
}

// Async handler wrapper
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
