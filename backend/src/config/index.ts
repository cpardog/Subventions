import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['BACKEND_PORT'] || '4000', 10),
  
  // Database
  databaseUrl: process.env['DATABASE_URL'] || '',
  
  // Redis
  redisUrl: process.env['REDIS_URL'] || 'redis://localhost:6379',
  
  // JWT
  jwt: {
    secret: process.env['JWT_SECRET'] || 'development-secret-change-in-production',
    expiresIn: process.env['JWT_EXPIRES_IN'] || '1h',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
  },
  
  // Session
  session: {
    secret: process.env['SESSION_SECRET'] || 'session-secret-change-in-production',
  },
  
  // CORS
  cors: {
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
    authMaxRequests: parseInt(process.env['AUTH_RATE_LIMIT_MAX'] || '5', 10),
  },
  
  // File Upload
  upload: {
    path: process.env['UPLOAD_PATH'] || './uploads',
    maxSizeMb: parseInt(process.env['MAX_FILE_SIZE_MB'] || '10', 10),
    allowedMimeTypes: (process.env['ALLOWED_MIME_TYPES'] || 'application/pdf,image/jpeg,image/png,image/jpg').split(','),
  },
  
  // Password Policy
  password: {
    minLength: parseInt(process.env['PASSWORD_MIN_LENGTH'] || '10', 10),
    historyCount: parseInt(process.env['PASSWORD_HISTORY_COUNT'] || '5', 10),
    lockoutAttempts: parseInt(process.env['ACCOUNT_LOCKOUT_ATTEMPTS'] || '5', 10),
    lockoutDurationMinutes: parseInt(process.env['ACCOUNT_LOCKOUT_DURATION_MINUTES'] || '30', 10),
  },
  
  // MFA
  mfa: {
    issuer: process.env['MFA_ISSUER'] || 'SistemaSubvenciones',
    requiredRoles: (process.env['MFA_REQUIRED_ROLES'] || 'DIRECTORA,ORDENADOR_GASTO,CRI,DIGER').split(','),
  },
  
  // Email
  email: {
    host: process.env['SMTP_HOST'] || '',
    port: parseInt(process.env['SMTP_PORT'] || '587', 10),
    secure: process.env['SMTP_SECURE'] === 'true',
    user: process.env['SMTP_USER'] || '',
    password: process.env['SMTP_PASSWORD'] || '',
    from: process.env['EMAIL_FROM'] || 'noreply@example.com',
  },
  
  // Logging
  logging: {
    level: process.env['LOG_LEVEL'] || 'info',
    format: process.env['LOG_FORMAT'] || 'json',
  },
  
  // PDF
  pdf: {
    companyName: process.env['PDF_COMPANY_NAME'] || 'Entidad Gubernamental',
    companyAddress: process.env['PDF_COMPANY_ADDRESS'] || '',
  },
};
