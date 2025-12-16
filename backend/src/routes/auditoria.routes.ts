import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { prisma } from '../config/database.js';
import { asyncHandler, ValidationError, AuthorizationError } from '../middlewares/errorHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { Rol, TipoEvento } from '@prisma/client';

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
 * GET /api/auditoria/eventos
 * Get audit events (admin roles only)
 */
router.get(
  '/eventos',
  authorize(Rol.DIGER, Rol.DIRECTORA, Rol.ORDENADOR_GASTO, Rol.CRI),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('procesoId').optional().isUUID(),
    query('usuarioId').optional().isUUID(),
    query('tipo').optional().isIn(Object.values(TipoEvento)),
    query('desde').optional().isISO8601(),
    query('hasta').optional().isISO8601(),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 50,
      procesoId,
      usuarioId,
      tipo,
      desde,
      hasta,
    } = req.query;

    const where: Record<string, unknown> = {};

    if (procesoId) {
      where['procesoId'] = procesoId;
    }

    if (usuarioId) {
      where['usuarioId'] = usuarioId;
    }

    if (tipo) {
      where['tipo'] = tipo;
    }

    if (desde || hasta) {
      where['creadoEn'] = {
        ...(desde && { gte: new Date(desde as string) }),
        ...(hasta && { lte: new Date(hasta as string) }),
      };
    }

    const [eventos, total] = await Promise.all([
      prisma.eventoAuditoria.findMany({
        where,
        include: {
          usuario: {
            select: { id: true, nombreCompleto: true, rol: true },
          },
          proceso: {
            select: { id: true, codigo: true },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { creadoEn: 'desc' },
      }),
      prisma.eventoAuditoria.count({ where }),
    ]);

    res.json({
      success: true,
      data: eventos,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

/**
 * GET /api/auditoria/proceso/:procesoId
 * Get all audit events for a process
 */
router.get(
  '/proceso/:procesoId',
  [
    param('procesoId').isUUID().withMessage('ID de proceso inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { procesoId } = req.params;
    const userId = req.user!.id;
    const userRol = req.user!.rol;

    // Check if user has access to this process
    const proceso = await prisma.proceso.findUnique({
      where: { id: procesoId },
    });

    if (!proceso) {
      throw new ValidationError({ procesoId: ['Proceso no encontrado'] });
    }

    // Check permissions
    if (userRol === Rol.BENEFICIARIO && proceso.beneficiarioId !== userId) {
      throw new AuthorizationError('No tiene acceso a este proceso');
    }

    if (userRol === Rol.ARRENDADOR && proceso.arrendadorId !== userId) {
      throw new AuthorizationError('No tiene acceso a este proceso');
    }

    const eventos = await prisma.eventoAuditoria.findMany({
      where: { procesoId },
      include: {
        usuario: {
          select: { id: true, nombreCompleto: true, rol: true },
        },
      },
      orderBy: { creadoEn: 'asc' },
    });

    // For beneficiario/arrendador, hide user names
    const isRestrictedRole = userRol === Rol.BENEFICIARIO || userRol === Rol.ARRENDADOR;
    const filteredEventos = eventos.map(evento => ({
      ...evento,
      usuario: isRestrictedRole
        ? evento.usuario ? { rol: evento.usuario.rol } : null
        : evento.usuario,
    }));

    res.json({
      success: true,
      data: filteredEventos,
    });
  })
);

/**
 * GET /api/auditoria/decisiones/:procesoId
 * Get all decisions for a process
 */
router.get(
  '/decisiones/:procesoId',
  [
    param('procesoId').isUUID().withMessage('ID de proceso inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { procesoId } = req.params;
    const userId = req.user!.id;
    const userRol = req.user!.rol;

    // Check if user has access to this process
    const proceso = await prisma.proceso.findUnique({
      where: { id: procesoId },
    });

    if (!proceso) {
      throw new ValidationError({ procesoId: ['Proceso no encontrado'] });
    }

    // Check permissions
    if (userRol === Rol.BENEFICIARIO && proceso.beneficiarioId !== userId) {
      throw new AuthorizationError('No tiene acceso a este proceso');
    }

    if (userRol === Rol.ARRENDADOR) {
      throw new AuthorizationError('No tiene acceso a las decisiones');
    }

    const decisiones = await prisma.decision.findMany({
      where: { procesoId },
      include: {
        usuario: {
          select: { id: true, nombreCompleto: true, rol: true },
        },
      },
      orderBy: { creadoEn: 'asc' },
    });

    // For beneficiario, hide user names
    const filteredDecisiones = decisiones.map(decision => ({
      ...decision,
      usuario: userRol === Rol.BENEFICIARIO
        ? { rol: decision.usuario.rol }
        : decision.usuario,
    }));

    res.json({
      success: true,
      data: filteredDecisiones,
    });
  })
);

/**
 * GET /api/auditoria/estadisticas
 * Get audit statistics (admin roles only)
 */
router.get(
  '/estadisticas',
  authorize(Rol.DIGER, Rol.DIRECTORA),
  asyncHandler(async (_req: Request, res: Response) => {
    const [
      totalProcesos,
      procesosPorEstado,
      eventosPorTipo,
      actividadUltimos30Dias,
    ] = await Promise.all([
      prisma.proceso.count(),
      prisma.proceso.groupBy({
        by: ['estado'],
        _count: { id: true },
      }),
      prisma.eventoAuditoria.groupBy({
        by: ['tipo'],
        _count: { id: true },
      }),
      prisma.eventoAuditoria.count({
        where: {
          creadoEn: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalProcesos,
        procesosPorEstado: procesosPorEstado.reduce((acc, item) => {
          acc[item.estado] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        eventosPorTipo: eventosPorTipo.reduce((acc, item) => {
          acc[item.tipo] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        actividadUltimos30Dias,
      },
    });
  })
);

export default router;
