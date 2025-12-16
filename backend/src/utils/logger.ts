import winston from 'winston';
import { config } from '../config/index.js';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Sanitize sensitive data from logs
const sanitizeFormat = winston.format((info) => {
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'mfaSecret'];
  
  const sanitize = (obj: Record<string, unknown>): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitize(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  return sanitize(info as Record<string, unknown>) as winston.Logform.TransformableInfo;
})();

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: { service: 'subvenciones-api' },
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    sanitizeFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.nodeEnv === 'production' 
        ? json()
        : combine(colorize(), devFormat),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: json(),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: json(),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Audit logger for security events
export const auditLogger = winston.createLogger({
  level: 'info',
  defaultMeta: { service: 'subvenciones-audit' },
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/audit.log',
      maxsize: 52428800, // 50MB
      maxFiles: 10,
    }),
  ],
});
