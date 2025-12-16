import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '../config/database.js';
import { sessionStore, tokenBlacklist } from '../config/redis.js';
import { config } from '../config/index.js';
import { hashPassword, verifyPassword, validatePasswordComplexity, generateSecureToken } from '../utils/password.js';
import { logger, auditLogger } from '../utils/logger.js';
import { AuthenticationError, ConflictError, AppError } from '../middlewares/errorHandler.js';
import { LoginRequest, LoginResponse, TokenPayload } from '../types/index.js';
import { Rol, EstadoUsuario } from '@prisma/client';

export class AuthService {
  /**
   * User login with password and optional MFA
   */
  async login(
    data: LoginRequest,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResponse> {
    const { email, password, mfaCode } = data;

    // Find user
    const user = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Prevent user enumeration by using same error message
      logger.warn('Login attempt for non-existent user', { email });
      throw new AuthenticationError('Credenciales inválidas');
    }

    // Check if account is locked
    if (user.bloqueadoHasta && user.bloqueadoHasta > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.bloqueadoHasta.getTime() - Date.now()) / 60000
      );
      throw new AuthenticationError(
        `Cuenta bloqueada. Intente en ${remainingMinutes} minutos`
      );
    }

    // Check if account is inactive
    if (user.estado !== EstadoUsuario.ACTIVO) {
      throw new AuthenticationError('Cuenta desactivada');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      // Increment failed attempts
      const newAttempts = user.intentosFallidos + 1;
      const updates: { intentosFallidos: number; bloqueadoHasta?: Date } = {
        intentosFallidos: newAttempts,
      };

      // Lock account after max attempts
      if (newAttempts >= config.password.lockoutAttempts) {
        const lockoutUntil = new Date(
          Date.now() + config.password.lockoutDurationMinutes * 60000
        );
        updates.bloqueadoHasta = lockoutUntil;

        auditLogger.warn('Account locked due to failed attempts', {
          userId: user.id,
          email: user.email,
          attempts: newAttempts,
          lockedUntil: lockoutUntil,
          ipAddress,
        });
      }

      await prisma.usuario.update({
        where: { id: user.id },
        data: updates,
      });

      throw new AuthenticationError('Credenciales inválidas');
    }

    // Check MFA if enabled
    if (user.mfaHabilitado) {
      if (!mfaCode) {
        return {
          accessToken: '',
          refreshToken: '',
          user: {
            id: user.id,
            email: user.email,
            nombreCompleto: user.nombreCompleto,
            rol: user.rol,
            mfaHabilitado: true,
          },
          requiresMfa: true,
        };
      }

      // Verify MFA code
      if (!user.mfaSecret) {
        throw new AppError('Configuración MFA inválida', 500);
      }

      const isValidMfa = authenticator.verify({
        token: mfaCode,
        secret: user.mfaSecret,
      });

      if (!isValidMfa) {
        throw new AuthenticationError('Código MFA inválido');
      }
    }

    // Reset failed attempts and update last access
    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        intentosFallidos: 0,
        bloqueadoHasta: null,
        ultimoAcceso: new Date(),
      },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user, ipAddress, userAgent);

    // Audit log
    auditLogger.info('User login successful', {
      userId: user.id,
      email: user.email,
      rol: user.rol,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nombreCompleto: user.nombreCompleto,
        rol: user.rol,
        mfaHabilitado: user.mfaHabilitado,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = jwt.verify(refreshToken, config.jwt.secret) as TokenPayload;

      if (payload.type !== 'refresh') {
        throw new AuthenticationError('Token inválido');
      }

      // Verify session exists
      const sessionData = await sessionStore.get(refreshToken);
      if (!sessionData) {
        throw new AuthenticationError('Sesión inválida o expirada');
      }

      // Get current user data
      const user = await prisma.usuario.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.estado !== EstadoUsuario.ACTIVO) {
        throw new AuthenticationError('Usuario no válido');
      }

      const accessToken = this.generateAccessToken(user);

      return { accessToken };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Sesión expirada');
      }
      throw error;
    }
  }

  /**
   * Logout - invalidate tokens
   */
  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    // Blacklist access token
    try {
      const payload = jwt.decode(accessToken) as TokenPayload;
      if (payload?.exp) {
        const ttl = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await tokenBlacklist.add(accessToken, ttl);
        }
      }
    } catch {
      // Ignore decode errors
    }

    // Invalidate refresh token session
    if (refreshToken) {
      await sessionStore.delete(refreshToken);
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string
  ): Promise<void> {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        passwordHistorial: {
          orderBy: { creadoEn: 'desc' },
          take: config.password.historyCount,
        },
      },
    });

    if (!user) {
      throw new AuthenticationError('Usuario no encontrado');
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Contraseña actual incorrecta');
    }

    // Validate new password complexity
    const validation = validatePasswordComplexity(newPassword);
    if (!validation.valid) {
      throw new ConflictError(validation.errors.join('. '));
    }

    // Check password history
    for (const history of user.passwordHistorial) {
      const isReused = await verifyPassword(newPassword, history.passwordHash);
      if (isReused) {
        throw new ConflictError(
          `No puede reutilizar las últimas ${config.password.historyCount} contraseñas`
        );
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password and add to history
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordHistorial.create({
        data: {
          usuarioId: userId,
          passwordHash: user.passwordHash,
        },
      }),
    ]);

    // Audit log
    auditLogger.info('Password changed', {
      userId,
      ipAddress,
    });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent user enumeration
    if (!user) {
      logger.info('Password reset requested for non-existent user', { email });
      return;
    }

    // Generate reset token
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.tokenRecuperacion.create({
      data: {
        usuarioId: user.id,
        token,
        expiraEn: expiresAt,
      },
    });

    // TODO: Send email with reset link
    logger.info('Password reset token generated', { userId: user.id });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await prisma.tokenRecuperacion.findUnique({
      where: { token },
      include: { usuario: true },
    });

    if (!resetToken || resetToken.usado || resetToken.expiraEn < new Date()) {
      throw new AuthenticationError('Token inválido o expirado');
    }

    // Validate new password
    const validation = validatePasswordComplexity(newPassword);
    if (!validation.valid) {
      throw new ConflictError(validation.errors.join('. '));
    }

    // Hash and update password
    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: resetToken.usuarioId },
        data: { passwordHash },
      }),
      prisma.tokenRecuperacion.update({
        where: { id: resetToken.id },
        data: { usado: true },
      }),
      prisma.passwordHistorial.create({
        data: {
          usuarioId: resetToken.usuarioId,
          passwordHash: resetToken.usuario.passwordHash,
        },
      }),
    ]);

    auditLogger.info('Password reset completed', {
      userId: resetToken.usuarioId,
    });
  }

  /**
   * Setup MFA for user
   */
  async setupMfa(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthenticationError('Usuario no encontrado');
    }

    if (user.mfaHabilitado) {
      throw new ConflictError('MFA ya está habilitado');
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate QR code
    const otpauth = authenticator.keyuri(
      user.email,
      config.mfa.issuer,
      secret
    );
    const qrCode = await QRCode.toDataURL(otpauth);

    // Store secret temporarily (will be confirmed on verification)
    await prisma.usuario.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return { secret, qrCode };
  }

  /**
   * Verify and enable MFA
   */
  async verifyMfa(userId: string, code: string): Promise<void> {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaSecret) {
      throw new AuthenticationError('Configuración MFA no iniciada');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.mfaSecret,
    });

    if (!isValid) {
      throw new AuthenticationError('Código MFA inválido');
    }

    await prisma.usuario.update({
      where: { id: userId },
      data: { mfaHabilitado: true },
    });

    auditLogger.info('MFA enabled', { userId });
  }

  /**
   * Disable MFA
   */
  async disableMfa(userId: string, password: string): Promise<void> {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthenticationError('Usuario no encontrado');
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Contraseña incorrecta');
    }

    await prisma.usuario.update({
      where: { id: userId },
      data: {
        mfaHabilitado: false,
        mfaSecret: null,
      },
    });

    auditLogger.info('MFA disabled', { userId });
  }

  // Private methods

  private generateAccessToken(user: {
    id: string;
    email: string;
    rol: Rol;
    nombreCompleto: string;
  }): string {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
      nombreCompleto: user.nombreCompleto,
      type: 'access',
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  private async generateRefreshToken(
    user: { id: string; email: string; rol: Rol; nombreCompleto: string },
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
      nombreCompleto: user.nombreCompleto,
      type: 'refresh',
    };

    const refreshToken: string = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
    });

    // Store session in Redis
    const sessionData = JSON.stringify({
      userId: user.id,
      ipAddress,
      userAgent,
      createdAt: new Date().toISOString(),
    });

    // Parse refresh token expiry (e.g., "7d" -> 7 days in seconds)
    const expiryMatch = config.jwt.refreshExpiresIn.match(/(\d+)([dhms])/);
    let ttlSeconds = 7 * 24 * 60 * 60; // Default 7 days
    if (expiryMatch) {
      const value = parseInt(expiryMatch[1] ?? '7', 10);
      const unit = expiryMatch[2];
      switch (unit) {
        case 'd':
          ttlSeconds = value * 24 * 60 * 60;
          break;
        case 'h':
          ttlSeconds = value * 60 * 60;
          break;
        case 'm':
          ttlSeconds = value * 60;
          break;
        case 's':
          ttlSeconds = value;
          break;
      }
    }

    await sessionStore.set(refreshToken, sessionData, ttlSeconds);

    // Store session in database for auditing
    // Use a hash of the full token to avoid collisions
    const tokenHash = require('crypto').createHash('sha256').update(refreshToken).digest('hex');
    await prisma.sesion.create({
      data: {
        usuarioId: user.id,
        tokenHash,
        ipAddress,
        userAgent,
        expiraEn: new Date(Date.now() + ttlSeconds * 1000),
      },
    });

    return refreshToken;
  }
}

export const authService = new AuthService();
