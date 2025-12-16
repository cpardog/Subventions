import { createReadStream, createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { auditLogger } from '../utils/logger.js';
import { NotFoundError, ConflictError, AuthorizationError, ValidationError } from '../middlewares/errorHandler.js';
import { Rol, EstadoProceso, EstadoDocumento, TipoDocumento, TipoEvento } from '@prisma/client';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class DocumentoService {
  private uploadPath: string;

  constructor() {
    this.uploadPath = config.upload.path;
    // Ensure upload directory exists
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * Upload a document
   */
  async uploadDocument(
    procesoId: string,
    tipoDocumento: TipoDocumento,
    file: UploadedFile,
    userId: string,
    userRol: Rol,
    ipAddress: string,
    userAgent: string
  ) {
    // Get process
    const proceso = await prisma.proceso.findUnique({
      where: { id: procesoId },
    });

    if (!proceso) {
      throw new NotFoundError('Proceso');
    }

    // Check permissions - BENEFICIARIO can upload to their own process, DIGER can upload to any
    if (userRol === Rol.BENEFICIARIO && proceso.beneficiarioId !== userId) {
      throw new AuthorizationError('Solo puede cargar documentos a su propio proceso');
    }
    if (userRol !== Rol.BENEFICIARIO && userRol !== Rol.DIGER) {
      throw new AuthorizationError('No tiene permisos para cargar documentos');
    }

    // Check process state
    if (proceso.estado !== EstadoProceso.BORRADOR && proceso.estado !== EstadoProceso.REQUIERE_CORRECCION) {
      throw new ConflictError('No se pueden cargar documentos en el estado actual');
    }

    // Get catalog entry
    const catalogo = await prisma.catalogoDocumento.findUnique({
      where: { tipo: tipoDocumento },
    });

    if (!catalogo || !catalogo.activo) {
      throw new NotFoundError('Tipo de documento');
    }

    // Validate file
    this.validateFile(file, catalogo);

    // Generate secure filename
    const fileExtension = path.extname(file.originalname);
    const secureFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.uploadPath, procesoId);

    // Ensure process directory exists
    if (!existsSync(filePath)) {
      mkdirSync(filePath, { recursive: true });
    }

    const fullPath = path.join(filePath, secureFilename);

    // Calculate file hash
    const fileHash = this.calculateHash(file.buffer);

    // Save file
    await this.saveFile(file.buffer, fullPath);

    // Deactivate previous versions of same document type
    await prisma.documento.updateMany({
      where: {
        procesoId,
        catalogoId: catalogo.id,
        esActivo: true,
      },
      data: { esActivo: false },
    });

    // Get current version number
    const lastVersion = await prisma.documento.findFirst({
      where: {
        procesoId,
        catalogoId: catalogo.id,
      },
      orderBy: { version: 'desc' },
    });

    // Create document record
    const documento = await prisma.documento.create({
      data: {
        procesoId,
        catalogoId: catalogo.id,
        nombreOriginal: file.originalname,
        nombreAlmacenado: secureFilename,
        rutaArchivo: fullPath,
        mimeType: file.mimetype,
        tamanoBytes: file.size,
        hashArchivo: fileHash,
        version: (lastVersion?.version ?? 0) + 1,
        cargadoPorId: userId,
      },
      include: {
        catalogo: true,
      },
    });

    // Audit
    await prisma.eventoAuditoria.create({
      data: {
        procesoId,
        usuarioId: userId,
        tipo: TipoEvento.EDICION,
        descripcion: `Documento cargado: ${catalogo.nombre}`,
        detalles: {
          documentoId: documento.id,
          tipoDocumento,
          nombreOriginal: file.originalname,
          version: documento.version,
        },
        ipAddress,
        userAgent,
      },
    });

    auditLogger.info('Document uploaded', {
      documentoId: documento.id,
      procesoId,
      tipoDocumento,
      userId,
    });

    return documento;
  }

  /**
   * Get document by ID
   */
  async getDocumentById(
    id: string,
    userId: string,
    userRol: Rol
  ) {
    const documento = await prisma.documento.findUnique({
      where: { id },
      include: {
        proceso: true,
        catalogo: true,
        cargadoPor: {
          select: { id: true, nombreCompleto: true },
        },
        validadoPor: {
          select: { id: true, nombreCompleto: true },
        },
      },
    });

    if (!documento) {
      throw new NotFoundError('Documento');
    }

    // Check permissions
    this.checkDocumentPermission(documento.proceso, userId, userRol);

    return documento;
  }

  /**
   * Get documents for a process
   */
  async getDocumentsByProceso(
    procesoId: string,
    userId: string,
    userRol: Rol,
    activeOnly: boolean = true
  ) {
    const proceso = await prisma.proceso.findUnique({
      where: { id: procesoId },
    });

    if (!proceso) {
      throw new NotFoundError('Proceso');
    }

    // Check permissions
    this.checkDocumentPermission(proceso, userId, userRol);

    const documentos = await prisma.documento.findMany({
      where: {
        procesoId,
        ...(activeOnly && { esActivo: true }),
      },
      include: {
        catalogo: true,
        validadoPor: {
          select: { id: true, nombreCompleto: true },
        },
      },
      orderBy: [
        { catalogo: { orden: 'asc' } },
        { version: 'desc' },
      ],
    });

    return documentos;
  }

  /**
   * Download document
   */
  async downloadDocument(
    id: string,
    userId: string,
    userRol: Rol,
    ipAddress: string,
    userAgent: string
  ) {
    const documento = await this.getDocumentById(id, userId, userRol);

    // Check if file exists
    if (!existsSync(documento.rutaArchivo)) {
      throw new NotFoundError('Archivo');
    }

    // Log download
    await prisma.registroDescarga.create({
      data: {
        documentoId: id,
        usuarioId: userId,
        ipAddress,
        userAgent,
      },
    });

    return {
      path: documento.rutaArchivo,
      filename: documento.nombreOriginal,
      mimetype: documento.mimeType,
    };
  }

  /**
   * Validate document (Diger)
   */
  async validateDocument(
    id: string,
    aprobado: boolean,
    motivo: string | undefined,
    userId: string,
    ipAddress: string,
    userAgent: string
  ) {
    const documento = await prisma.documento.findUnique({
      where: { id },
      include: { proceso: true, catalogo: true },
    });

    if (!documento) {
      throw new NotFoundError('Documento');
    }

    // Check process is in validation state
    if (documento.proceso.estado !== EstadoProceso.DOCUMENTOS_EN_VALIDACION) {
      throw new ConflictError('El proceso no está en validación');
    }

    // Require rejection reason
    if (!aprobado && !motivo) {
      throw new ValidationError({ motivo: ['Se requiere motivo de rechazo'] });
    }

    // Update document
    const updated = await prisma.documento.update({
      where: { id },
      data: {
        estado: aprobado ? EstadoDocumento.APROBADO : EstadoDocumento.RECHAZADO,
        validadoPorId: userId,
        validadoEn: new Date(),
        motivoRechazo: aprobado ? null : motivo,
      },
    });

    // Audit
    await prisma.eventoAuditoria.create({
      data: {
        procesoId: documento.procesoId,
        usuarioId: userId,
        tipo: TipoEvento.VALIDACION,
        descripcion: `Documento ${aprobado ? 'aprobado' : 'rechazado'}: ${documento.catalogo.nombre}`,
        detalles: {
          documentoId: id,
          aprobado,
          motivo,
        },
        ipAddress,
        userAgent,
      },
    });

    auditLogger.info('Document validated', {
      documentoId: id,
      procesoId: documento.procesoId,
      aprobado,
      userId,
    });

    return updated;
  }

  /**
   * Delete document (only in BORRADOR state)
   */
  async deleteDocument(
    id: string,
    userId: string,
    userRol: Rol,
    ipAddress: string,
    userAgent: string
  ) {
    const documento = await prisma.documento.findUnique({
      where: { id },
      include: { proceso: true, catalogo: true },
    });

    if (!documento) {
      throw new NotFoundError('Documento');
    }

    // Check permissions
    if (userRol !== Rol.BENEFICIARIO || documento.proceso.beneficiarioId !== userId) {
      throw new AuthorizationError('Solo el beneficiario puede eliminar documentos');
    }

    // Check state
    if (documento.proceso.estado !== EstadoProceso.BORRADOR) {
      throw new ConflictError('No se pueden eliminar documentos después del envío');
    }

    // Delete file
    if (existsSync(documento.rutaArchivo)) {
      unlinkSync(documento.rutaArchivo);
    }

    // Delete record
    await prisma.documento.delete({
      where: { id },
    });

    // Audit
    await prisma.eventoAuditoria.create({
      data: {
        procesoId: documento.procesoId,
        usuarioId: userId,
        tipo: TipoEvento.EDICION,
        descripcion: `Documento eliminado: ${documento.catalogo.nombre}`,
        detalles: {
          documentoId: id,
          tipoDocumento: documento.catalogo.tipo,
        },
        ipAddress,
        userAgent,
      },
    });

    auditLogger.info('Document deleted', {
      documentoId: id,
      procesoId: documento.procesoId,
      userId,
    });
  }

  // Private methods

  private validateFile(
    file: UploadedFile,
    catalogo: { formatosPermitidos: string[]; tamanoMaximoMb: number; nombre: string }
  ) {
    // Validate MIME type
    if (!catalogo.formatosPermitidos.includes(file.mimetype)) {
      throw new ValidationError({
        file: [`Tipo de archivo no permitido. Permitidos: ${catalogo.formatosPermitidos.join(', ')}`],
      });
    }

    // Validate size
    const maxBytes = catalogo.tamanoMaximoMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new ValidationError({
        file: [`El archivo excede el tamaño máximo de ${catalogo.tamanoMaximoMb}MB`],
      });
    }

    // Validate extension matches MIME type
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeExtMap: Record<string, string[]> = {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    };

    const allowedExts = mimeExtMap[file.mimetype] || [];
    if (!allowedExts.includes(ext)) {
      throw new ValidationError({
        file: ['La extensión del archivo no coincide con su tipo'],
      });
    }
  }

  private calculateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private async saveFile(buffer: Buffer, filePath: string): Promise<void> {
    const writeStream = createWriteStream(filePath);
    const { Readable } = await import('stream');
    const readable = Readable.from(buffer);
    await pipeline(readable, writeStream);
  }

  private checkDocumentPermission(
    proceso: { beneficiarioId: string; arrendadorId: string | null },
    userId: string,
    userRol: Rol
  ) {
    // Arrendador cannot view documents
    if (userRol === Rol.ARRENDADOR) {
      throw new AuthorizationError('No tiene permisos para ver documentos');
    }

    // Beneficiario can only see their own process documents
    if (userRol === Rol.BENEFICIARIO && proceso.beneficiarioId !== userId) {
      throw new AuthorizationError('No tiene permisos para ver estos documentos');
    }
  }
}

export const documentoService = new DocumentoService();
