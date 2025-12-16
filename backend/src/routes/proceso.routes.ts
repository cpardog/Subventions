import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { procesoService } from '../services/proceso.service.js';
import { asyncHandler, ValidationError } from '../middlewares/errorHandler.js';
import { authenticate, authorize, authorizeProcessAction } from '../middlewares/auth.js';
import { Rol, EstadoProceso } from '@prisma/client';

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
 * GET /api/procesos
 * List processes (filtered by role)
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('estado').optional().isIn(Object.values(EstadoProceso)),
    query('search').optional().isString().trim(),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const userRol = req.user!.rol;
    const { page = 1, limit = 20, estado, search } = req.query;

    const result = await procesoService.getProcesos(userId, userRol, {
      page: Number(page),
      limit: Number(limit),
      estado: estado as EstadoProceso | undefined,
      search: search as string | undefined,
    });

    res.json({
      success: true,
      data: result.procesos,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  })
);

/**
 * POST /api/procesos
 * Create new process (Diger only)
 */
router.post(
  '/',
  authorizeProcessAction('create'),
  [
    body('beneficiarioId').isUUID().withMessage('ID de beneficiario inválido'),
    body('arrendadorId').optional().isUUID().withMessage('ID de arrendador inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { beneficiarioId, arrendadorId } = req.body;
    const createdById = req.user!.id;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const proceso = await procesoService.createProceso(
      beneficiarioId,
      arrendadorId,
      createdById,
      ipAddress,
      userAgent
    );

    res.status(201).json({
      success: true,
      data: proceso,
    });
  })
);

/**
 * GET /api/procesos/:id
 * Get process by ID
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('ID inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRol = req.user!.rol;

    const proceso = await procesoService.getProcesoById(id!, userId, userRol);

    res.json({
      success: true,
      data: proceso,
    });
  })
);

/**
 * PATCH /api/procesos/:id/formulario
 * Update process form (Beneficiario only)
 */
router.patch(
  '/:id/formulario',
  authorizeProcessAction('edit'),
  [
    param('id').isUUID().withMessage('ID inválido'),
    body('formulario').isObject().withMessage('Formulario debe ser un objeto'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { formulario } = req.body;
    const userId = req.user!.id;
    const userRol = req.user!.rol;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const proceso = await procesoService.updateFormulario(
      id!,
      formulario,
      userId,
      userRol,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      data: proceso,
    });
  })
);

/**
 * POST /api/procesos/:id/submit
 * Submit process for review
 */
router.post(
  '/:id/submit',
  authorizeProcessAction('submit'),
  [
    param('id').isUUID().withMessage('ID inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const proceso = await procesoService.submitProceso(id!, userId, ipAddress, userAgent);

    res.json({
      success: true,
      data: proceso,
    });
  })
);

/**
 * POST /api/procesos/:id/start-validation
 * Start document validation (Diger)
 */
router.post(
  '/:id/start-validation',
  authorizeProcessAction('validateDocs'),
  [
    param('id').isUUID().withMessage('ID inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const proceso = await procesoService.startValidation(id!, userId, ipAddress, userAgent);

    res.json({
      success: true,
      data: proceso,
    });
  })
);

/**
 * POST /api/procesos/:id/decision
 * Make a decision on process
 */
router.post(
  '/:id/decision',
  authorize(Rol.DIGER, Rol.DIRECTORA, Rol.ORDENADOR_GASTO),
  [
    param('id').isUUID().withMessage('ID inválido'),
    body('aprobado').isBoolean().withMessage('Campo aprobado requerido'),
    body('motivo').notEmpty().isLength({ min: 10, max: 2000 }).withMessage('Motivo requerido (10-2000 caracteres)'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { aprobado, motivo } = req.body;
    const userId = req.user!.id;
    const userRol = req.user!.rol;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const proceso = await procesoService.makeDecision(
      id!,
      { aprobado, motivo },
      userId,
      userRol,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      data: proceso,
    });
  })
);

/**
 * POST /api/procesos/:id/request-correction
 * Request corrections from beneficiary (Diger)
 */
router.post(
  '/:id/request-correction',
  authorizeProcessAction('requestCorrection'),
  [
    param('id').isUUID().withMessage('ID inválido'),
    body('motivo').notEmpty().isLength({ min: 10, max: 2000 }).withMessage('Motivo requerido (10-2000 caracteres)'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { motivo } = req.body;
    const userId = req.user!.id;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const proceso = await procesoService.requestCorrection(id!, motivo, userId, ipAddress, userAgent);

    res.json({
      success: true,
      data: proceso,
    });
  })
);

/**
 * POST /api/procesos/:id/sign
 * Sign process (Ordenador del Gasto)
 */
router.post(
  '/:id/sign',
  authorizeProcessAction('sign'),
  [
    param('id').isUUID().withMessage('ID inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const proceso = await procesoService.signProceso(id!, userId, ipAddress, userAgent);

    res.json({
      success: true,
      data: proceso,
    });
  })
);

/**
 * POST /api/procesos/:id/close
 * Close/finalize process (CRI)
 */
router.post(
  '/:id/close',
  authorizeProcessAction('close'),
  [
    param('id').isUUID().withMessage('ID inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const proceso = await procesoService.closeProceso(id!, userId, ipAddress, userAgent);

    res.json({
      success: true,
      data: proceso,
    });
  })
);

/**
 * GET /api/procesos/:id/timeline
 * Get process timeline
 */
router.get(
  '/:id/timeline',
  [
    param('id').isUUID().withMessage('ID inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRol = req.user!.rol;

    const timeline = await procesoService.getTimeline(id!, userId, userRol);

    res.json({
      success: true,
      data: timeline,
    });
  })
);

export default router;
