import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/auth.service.js';
import { asyncHandler, ValidationError } from '../middlewares/errorHandler.js';
import { authenticate } from '../middlewares/auth.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middlewares/rateLimiter.js';

const router: Router = Router();

// Validation middleware
const validate = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted: Record<string, string[]> = {};
    errors.array().forEach(err => {
      const field = 'path' in err ? err.path : 'unknown';
      if (!formatted[field]) formatted[field] = [];
      formatted[field].push(err.msg);
    });
    throw new ValidationError(formatted);
  }
  next();
};

/**
 * POST /api/auth/login
 * User login
 */
router.post(
  '/login',
  authRateLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida'),
    body('mfaCode').optional().isLength({ min: 6, max: 6 }).withMessage('Código MFA debe ser de 6 dígitos'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, mfaCode } = req.body;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const result = await authService.login(
      { email, password, mfaCode },
      ipAddress,
      userAgent
    );

    // Set refresh token in httpOnly cookie
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
        requiresMfa: result.requiresMfa,
      },
    });
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies['refreshToken'] || req.body['refreshToken'];

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'Token de refresco requerido' },
      });
      return;
    }

    const result = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/auth/logout
 * User logout
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const accessToken = req.token || '';
    const refreshToken = req.cookies['refreshToken'];

    await authService.logout(accessToken, refreshToken);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Sesión cerrada correctamente',
    });
  })
);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword').isLength({ min: 10 }).withMessage('Nueva contraseña debe tener al menos 10 caracteres'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;
    const ipAddress = req.ip || 'unknown';

    await authService.changePassword(userId, currentPassword, newPassword, ipAddress);

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  })
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    await authService.requestPasswordReset(email);

    // Always return success to prevent user enumeration
    res.json({
      success: true,
      message: 'Si el email existe, recibirá instrucciones de recuperación',
    });
  })
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token requerido'),
    body('newPassword').isLength({ min: 10 }).withMessage('Nueva contraseña debe tener al menos 10 caracteres'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    await authService.resetPassword(token, newPassword);

    res.json({
      success: true,
      message: 'Contraseña restablecida correctamente',
    });
  })
);

/**
 * POST /api/auth/mfa/setup
 * Setup MFA for authenticated user
 */
router.post(
  '/mfa/setup',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const result = await authService.setupMfa(userId);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/auth/mfa/verify
 * Verify and enable MFA
 */
router.post(
  '/mfa/verify',
  authenticate,
  [
    body('code').isLength({ min: 6, max: 6 }).withMessage('Código debe ser de 6 dígitos'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;
    const userId = req.user!.id;

    await authService.verifyMfa(userId, code);

    res.json({
      success: true,
      message: 'MFA habilitado correctamente',
    });
  })
);

/**
 * POST /api/auth/mfa/disable
 * Disable MFA
 */
router.post(
  '/mfa/disable',
  authenticate,
  [
    body('password').notEmpty().withMessage('Contraseña requerida para deshabilitar MFA'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { password } = req.body;
    const userId = req.user!.id;

    await authService.disableMfa(userId, password);

    res.json({
      success: true,
      message: 'MFA deshabilitado correctamente',
    });
  })
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      data: req.user,
    });
  })
);

export default router;
