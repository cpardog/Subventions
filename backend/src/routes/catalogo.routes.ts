import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { authenticate } from '../middlewares/auth.js';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/catalogo/documentos
 * Get document types catalog
 */
router.get(
  '/documentos',
  asyncHandler(async (_req: Request, res: Response) => {
    const catalogo = await prisma.catalogoDocumento.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
    });

    res.json({
      success: true,
      data: catalogo,
    });
  })
);

/**
 * GET /api/catalogo/convocatorias
 * Get active convocatorias
 */
router.get(
  '/convocatorias',
  asyncHandler(async (_req: Request, res: Response) => {
    const convocatorias = await prisma.convocatoria.findMany({
      where: {
        activa: true,
        fechaFin: { gte: new Date() },
      },
      orderBy: { fechaInicio: 'desc' },
    });

    res.json({
      success: true,
      data: convocatorias,
    });
  })
);

/**
 * GET /api/catalogo/roles
 * Get available roles
 */
router.get(
  '/roles',
  asyncHandler(async (_req: Request, res: Response) => {
    const roles = [
      { id: 'BENEFICIARIO', nombre: 'Beneficiario', descripcion: 'Postulante a la subvención' },
      { id: 'ARRENDADOR', nombre: 'Arrendador', descripcion: 'Propietario del inmueble' },
      { id: 'DIGER', nombre: 'DIGER', descripcion: 'Administrador y validador' },
      { id: 'DIRECTORA', nombre: 'Directora', descripcion: 'Aprobador nivel 2' },
      { id: 'ORDENADOR_GASTO', nombre: 'Ordenador del Gasto', descripcion: 'Aprobador y firmante' },
      { id: 'CRI', nombre: 'CRI', descripcion: 'Cierre de procesos' },
    ];

    res.json({
      success: true,
      data: roles,
    });
  })
);

/**
 * GET /api/catalogo/estados
 * Get process states
 */
router.get(
  '/estados',
  asyncHandler(async (_req: Request, res: Response) => {
    const estados = [
      { id: 'BORRADOR', nombre: 'Borrador', descripcion: 'En edición por beneficiario' },
      { id: 'ENVIADA', nombre: 'Enviada', descripcion: 'Enviada para revisión' },
      { id: 'DOCUMENTOS_EN_VALIDACION', nombre: 'Documentos en Validación', descripcion: 'DIGER validando documentos' },
      { id: 'REQUIERE_CORRECCION', nombre: 'Requiere Corrección', descripcion: 'Devuelto para correcciones' },
      { id: 'VALIDADA_DIGER', nombre: 'Validada por DIGER', descripcion: 'Aprobada por DIGER' },
      { id: 'REVISION_DIRECTORA', nombre: 'Revisión Directora', descripcion: 'En revisión por Directora' },
      { id: 'REVISION_ORDENADOR', nombre: 'Revisión Ordenador', descripcion: 'En revisión por Ordenador del Gasto' },
      { id: 'FIRMADA', nombre: 'Firmada', descripcion: 'Firmada electrónicamente' },
      { id: 'FINALIZADA', nombre: 'Finalizada', descripcion: 'Proceso cerrado' },
      { id: 'RECHAZADA', nombre: 'Rechazada', descripcion: 'Rechazada definitivamente' },
    ];

    res.json({
      success: true,
      data: estados,
    });
  })
);

export default router;
