import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import multer from 'multer';
import { documentoService } from '../services/documento.service.js';
import { asyncHandler, ValidationError } from '../middlewares/errorHandler.js';
import { authenticate, authorizeDocumentAction } from '../middlewares/auth.js';
import { uploadRateLimiter } from '../middlewares/rateLimiter.js';
import { config } from '../config/index.js';
import { TipoDocumento } from '@prisma/client';

const router: Router = Router();

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxSizeMb * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  },
});

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
 * POST /api/documentos/:procesoId/upload
 * Upload document to process
 */
router.post(
  '/:procesoId/upload',
  authorizeDocumentAction('upload'),
  uploadRateLimiter,
  upload.single('file'),
  [
    param('procesoId').isUUID().withMessage('ID de proceso inválido'),
    body('tipoDocumento').isIn(Object.values(TipoDocumento)).withMessage('Tipo de documento inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { procesoId } = req.params;
    const { tipoDocumento } = req.body;
    const userId = req.user!.id;
    const userRol = req.user!.rol;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    if (!req.file) {
      throw new ValidationError({ file: ['Archivo requerido'] });
    }

    const documento = await documentoService.uploadDocument(
      procesoId!,
      tipoDocumento as TipoDocumento,
      {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
      },
      userId,
      userRol,
      ipAddress,
      userAgent
    );

    res.status(201).json({
      success: true,
      data: documento,
    });
  })
);

/**
 * GET /api/documentos/proceso/:procesoId
 * Get all documents for a process
 */
router.get(
  '/proceso/:procesoId',
  authorizeDocumentAction('view'),
  [
    param('procesoId').isUUID().withMessage('ID de proceso inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { procesoId } = req.params;
    const userId = req.user!.id;
    const userRol = req.user!.rol;

    const documentos = await documentoService.getDocumentsByProceso(procesoId!, userId, userRol);

    res.json({
      success: true,
      data: documentos,
    });
  })
);

/**
 * GET /api/documentos/:id
 * Get document by ID
 */
router.get(
  '/:id',
  authorizeDocumentAction('view'),
  [
    param('id').isUUID().withMessage('ID inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRol = req.user!.rol;

    const documento = await documentoService.getDocumentById(id!, userId, userRol);

    res.json({
      success: true,
      data: documento,
    });
  })
);

/**
 * GET /api/documentos/:id/download
 * Download document file
 */
router.get(
  '/:id/download',
  authorizeDocumentAction('download'),
  [
    param('id').isUUID().withMessage('ID inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRol = req.user!.rol;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const { path, filename, mimetype } = await documentoService.downloadDocument(
      id!,
      userId,
      userRol,
      ipAddress,
      userAgent
    );

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.sendFile(path);
  })
);

/**
 * POST /api/documentos/:id/validate
 * Validate document (Diger only)
 */
router.post(
  '/:id/validate',
  authorizeDocumentAction('validate'),
  [
    param('id').isUUID().withMessage('ID inválido'),
    body('aprobado').isBoolean().withMessage('Campo aprobado requerido'),
    body('motivo').optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { aprobado, motivo } = req.body;
    const userId = req.user!.id;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const documento = await documentoService.validateDocument(
      id!,
      aprobado,
      motivo,
      userId,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      data: documento,
    });
  })
);

/**
 * DELETE /api/documentos/:id
 * Delete document (Beneficiario, only in BORRADOR state)
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('ID inválido'),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRol = req.user!.rol;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    await documentoService.deleteDocument(id!, userId, userRol, ipAddress, userAgent);

    res.json({
      success: true,
      message: 'Documento eliminado',
    });
  })
);

export default router;
