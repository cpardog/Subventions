import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { userService } from '../services/user.service.js';
import { asyncHandler, ValidationError } from '../middlewares/errorHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { Rol } from '@prisma/client';

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

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/users
 * List users (Diger only)
 */
router.get(
  '/',
  authorize(Rol.DIGER),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('rol').optional().isIn(Object.values(Rol)),
    query('estado').optional().isIn(['ACTIVO', 'INACTIVO', 'BLOQUEADO']),
    query('search').optional().isString().trim(),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, rol, estado, search } = req.query;

    const result = await userService.getUsers({
      page: Number(page),
      limit: Number(limit),
      rol: rol as Rol | undefined,
      estado: estado as 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO' | undefined,
      search: search as string | undefined,
    });

    res.json({
      success: true,
      data: result.users,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(limit)),
      },
    });
  })
);

/**
 * POST /api/users
 * Create new user (Diger only)
 */
router.post(
  '/',
  authorize(Rol.DIGER),
  [
    body('cedula').notEmpty().isLength({ min: 6, max: 20 }).withMessage('Cédula inválida'),
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('nombreCompleto').notEmpty().trim().isLength({ min: 3, max: 200 }).withMessage('Nombre requerido'),
    body('password').isLength({ min: 10 }).withMessage('Contraseña debe tener al menos 10 caracteres'),
    body('rol').isIn(Object.values(Rol)).withMessage('Rol inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { cedula, email, nombreCompleto, password, rol } = req.body;
    const createdById = req.user!.id;
    const ipAddress = req.ip || 'unknown';

    const user = await userService.createUser(
      { cedula, email, nombreCompleto, password, rol },
      createdById,
      ipAddress
    );

    res.status(201).json({
      success: true,
      data: user,
    });
  })
);

/**
 * GET /api/users/by-role/:rol
 * Get users by role (for selection dropdowns)
 */
router.get(
  '/by-role/:rol',
  authorize(Rol.DIGER),
  [
    param('rol').isIn(Object.values(Rol)).withMessage('Rol inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const rol = req.params['rol'] as Rol;

    const users = await userService.getUsersByRole(rol);

    res.json({
      success: true,
      data: users,
    });
  })
);

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get(
  '/:id',
  authorize(Rol.DIGER),
  [
    param('id').isUUID().withMessage('ID inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await userService.getUserById(id!);

    res.json({
      success: true,
      data: user,
    });
  })
);

/**
 * PATCH /api/users/:id
 * Update user
 */
router.patch(
  '/:id',
  authorize(Rol.DIGER),
  [
    param('id').isUUID().withMessage('ID inválido'),
    body('nombreCompleto').optional().trim().isLength({ min: 3, max: 200 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('estado').optional().isIn(['ACTIVO', 'INACTIVO']),
    body('rol').optional().isIn(Object.values(Rol)),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const updatedById = req.user!.id;
    const ipAddress = req.ip || 'unknown';

    const user = await userService.updateUser(id!, updates, updatedById, ipAddress);

    res.json({
      success: true,
      data: user,
    });
  })
);

/**
 * POST /api/users/:id/deactivate
 * Deactivate user
 */
router.post(
  '/:id/deactivate',
  authorize(Rol.DIGER),
  [
    param('id').isUUID().withMessage('ID inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deactivatedById = req.user!.id;
    const ipAddress = req.ip || 'unknown';

    await userService.deactivateUser(id!, deactivatedById, ipAddress);

    res.json({
      success: true,
      message: 'Usuario desactivado',
    });
  })
);

/**
 * POST /api/users/:id/unlock
 * Unlock user account
 */
router.post(
  '/:id/unlock',
  authorize(Rol.DIGER),
  [
    param('id').isUUID().withMessage('ID inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const unlockedById = req.user!.id;
    const ipAddress = req.ip || 'unknown';

    await userService.unlockUser(id!, unlockedById, ipAddress);

    res.json({
      success: true,
      message: 'Usuario desbloqueado',
    });
  })
);

export default router;
