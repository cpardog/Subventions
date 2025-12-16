import { prisma } from '../config/database.js';
import { auditLogger } from '../utils/logger.js';
import { NotFoundError, ConflictError, AuthorizationError } from '../middlewares/errorHandler.js';
import { ALLOWED_STATE_TRANSITIONS, STATE_APPROVAL_ROLES, DecisionRequest } from '../types/index.js';
import { Rol, EstadoProceso, TipoEvento, Prisma } from '@prisma/client';
import { pdfService } from './pdf.service.js';

export class ProcesoService {
  /**
   * Create a new process (Diger only)
   */
  async createProceso(
    beneficiarioId: string,
    arrendadorId: string | undefined,
    createdById: string,
    ipAddress: string,
    userAgent: string
  ) {
    // Verify beneficiario exists and has correct role
    const beneficiario = await prisma.usuario.findUnique({
      where: { id: beneficiarioId },
    });

    if (!beneficiario || beneficiario.rol !== Rol.BENEFICIARIO) {
      throw new NotFoundError('Beneficiario');
    }

    // Verify arrendador if provided
    if (arrendadorId) {
      const arrendador = await prisma.usuario.findUnique({
        where: { id: arrendadorId },
      });
      if (!arrendador || arrendador.rol !== Rol.ARRENDADOR) {
        throw new NotFoundError('Arrendador');
      }
    }

    // Generate unique code
    const year = new Date().getFullYear();
    const count = await prisma.proceso.count({
      where: {
        codigo: { startsWith: `SUB-${year}` },
      },
    });
    const codigo = `SUB-${year}-${String(count + 1).padStart(6, '0')}`;

    // Create process
    const proceso = await prisma.proceso.create({
      data: {
        codigo,
        beneficiarioId,
        arrendadorId,
      },
      include: {
        beneficiario: {
          select: { id: true, nombreCompleto: true, cedula: true },
        },
        arrendador: {
          select: { id: true, nombreCompleto: true },
        },
      },
    });

    // Create audit event
    await this.createAuditEvent(
      proceso.id,
      createdById,
      TipoEvento.CREACION,
      'Proceso de subvención creado',
      { codigo: proceso.codigo },
      ipAddress,
      userAgent
    );

    auditLogger.info('Process created', {
      procesoId: proceso.id,
      codigo: proceso.codigo,
      beneficiarioId,
      createdBy: createdById,
    });

    return proceso;
  }

  /**
   * Get process by ID with permissions check
   */
  async getProcesoById(id: string, userId: string, userRol: Rol) {
    const proceso = await prisma.proceso.findUnique({
      where: { id },
      include: {
        beneficiario: {
          select: { id: true, nombreCompleto: true, cedula: true, email: true },
        },
        arrendador: {
          select: { id: true, nombreCompleto: true },
        },
        documentos: {
          where: { esActivo: true },
          include: {
            catalogo: true,
          },
          orderBy: { creadoEn: 'desc' },
        },
        decisiones: {
          orderBy: { creadoEn: 'desc' },
          take: 10,
        },
      },
    });

    if (!proceso) {
      throw new NotFoundError('Proceso');
    }

    // Check permissions
    this.checkViewPermission(proceso, userId, userRol);

    return proceso;
  }

  /**
   * Get processes with filters (based on role)
   */
  async getProcesos(
    userId: string,
    userRol: Rol,
    filters: {
      estado?: EstadoProceso;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { estado, search, page = 1, limit = 20 } = filters;

    const where: Record<string, unknown> = {};

    // Role-based filtering
    switch (userRol) {
      case Rol.BENEFICIARIO:
        where['beneficiarioId'] = userId;
        break;
      case Rol.ARRENDADOR:
        where['arrendadorId'] = userId;
        break;
      case Rol.DIGER:
        // DIGER can see all processes
        break;
      case Rol.DIRECTORA:
        where['estado'] = { in: [EstadoProceso.REVISION_DIRECTORA, EstadoProceso.REVISION_ORDENADOR, EstadoProceso.FIRMADA, EstadoProceso.FINALIZADA] };
        break;
      case Rol.ORDENADOR_GASTO:
        where['estado'] = { in: [EstadoProceso.REVISION_ORDENADOR, EstadoProceso.FIRMADA, EstadoProceso.FINALIZADA] };
        break;
      case Rol.CRI:
        where['estado'] = { in: [EstadoProceso.FIRMADA, EstadoProceso.FINALIZADA] };
        break;
    }

    // Additional filters
    if (estado) {
      where['estado'] = estado;
    }

    if (search) {
      where['OR'] = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { beneficiario: { nombreCompleto: { contains: search, mode: 'insensitive' } } },
        { beneficiario: { cedula: { contains: search } } },
      ];
    }

    const [procesos, total] = await Promise.all([
      prisma.proceso.findMany({
        where,
        include: {
          beneficiario: {
            select: { id: true, nombreCompleto: true, cedula: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { actualizadoEn: 'desc' },
      }),
      prisma.proceso.count({ where }),
    ]);

    return { procesos, total, page, limit };
  }

  /**
   * Update process form data (Beneficiario only, in BORRADOR state)
   */
  async updateFormulario(
    id: string,
    formulario: Record<string, unknown>,
    userId: string,
    userRol: Rol,
    ipAddress: string,
    userAgent: string
  ) {
    const proceso = await prisma.proceso.findUnique({
      where: { id },
    });

    if (!proceso) {
      throw new NotFoundError('Proceso');
    }

    // Only beneficiario can edit
    if (userRol !== Rol.BENEFICIARIO || proceso.beneficiarioId !== userId) {
      throw new AuthorizationError('Solo el beneficiario puede editar el formulario');
    }

    // Only in BORRADOR or REQUIERE_CORRECCION state
    if (proceso.estado !== EstadoProceso.BORRADOR && proceso.estado !== EstadoProceso.REQUIERE_CORRECCION) {
      throw new ConflictError('El proceso no puede ser editado en su estado actual');
    }

    const updated = await prisma.proceso.update({
      where: { id },
      data: { formulario: formulario as Prisma.InputJsonValue },
    });

    await this.createAuditEvent(
      id,
      userId,
      TipoEvento.EDICION,
      'Formulario actualizado',
      { campos: Object.keys(formulario) },
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Submit process for review
   */
  async submitProceso(
    id: string,
    userId: string,
    ipAddress: string,
    userAgent: string
  ) {
    const proceso = await prisma.proceso.findUnique({
      where: { id },
      include: {
        documentos: {
          where: { esActivo: true },
          include: { catalogo: true },
        },
      },
    });

    if (!proceso) {
      throw new NotFoundError('Proceso');
    }

    if (proceso.beneficiarioId !== userId) {
      throw new AuthorizationError('Solo el beneficiario puede enviar el proceso');
    }

    if (proceso.estado !== EstadoProceso.BORRADOR && proceso.estado !== EstadoProceso.REQUIERE_CORRECCION) {
      throw new ConflictError('El proceso no puede ser enviado en su estado actual');
    }

    // Verify all required documents are uploaded
    const requiredDocs = await prisma.catalogoDocumento.findMany({
      where: { obligatorio: true, activo: true },
    });

    const uploadedDocTypes = new Set(proceso.documentos.map(d => d.catalogo.tipo));
    const missingDocs = requiredDocs.filter(doc => !uploadedDocTypes.has(doc.tipo));

    if (missingDocs.length > 0) {
      throw new ConflictError(
        `Faltan documentos obligatorios: ${missingDocs.map(d => d.nombre).join(', ')}`
      );
    }

    // Verify form is complete
    if (!proceso.formulario) {
      throw new ConflictError('Debe completar el formulario antes de enviar');
    }

    // Update state
    const newState = proceso.estado === EstadoProceso.REQUIERE_CORRECCION
      ? EstadoProceso.DOCUMENTOS_EN_VALIDACION
      : EstadoProceso.ENVIADA;

    const updated = await prisma.proceso.update({
      where: { id },
      data: {
        estado: newState,
        enviadoEn: proceso.estado === EstadoProceso.BORRADOR ? new Date() : undefined,
      },
    });

    await this.createAuditEvent(
      id,
      userId,
      TipoEvento.ENVIO,
      proceso.estado === EstadoProceso.REQUIERE_CORRECCION
        ? 'Correcciones enviadas'
        : 'Proceso enviado para revisión',
      { estadoAnterior: proceso.estado, estadoNuevo: newState },
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Start document validation (Diger)
   */
  async startValidation(
    id: string,
    userId: string,
    ipAddress: string,
    userAgent: string
  ) {
    const proceso = await prisma.proceso.findUnique({ where: { id } });

    if (!proceso) {
      throw new NotFoundError('Proceso');
    }

    if (proceso.estado !== EstadoProceso.ENVIADA) {
      throw new ConflictError('El proceso no está en estado para iniciar validación');
    }

    const updated = await prisma.proceso.update({
      where: { id },
      data: { estado: EstadoProceso.DOCUMENTOS_EN_VALIDACION },
    });

    await this.createAuditEvent(
      id,
      userId,
      TipoEvento.CAMBIO_ESTADO,
      'Validación de documentos iniciada',
      { estadoAnterior: proceso.estado, estadoNuevo: EstadoProceso.DOCUMENTOS_EN_VALIDACION },
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Make a decision on a process
   */
  async makeDecision(
    id: string,
    decision: DecisionRequest,
    userId: string,
    userRol: Rol,
    ipAddress: string,
    userAgent: string
  ) {
    const proceso = await prisma.proceso.findUnique({ where: { id } });

    if (!proceso) {
      throw new NotFoundError('Proceso');
    }

    // Verify user has permission for current state
    const allowedRol = STATE_APPROVAL_ROLES[proceso.estado];
    if (allowedRol && userRol !== allowedRol) {
      throw new AuthorizationError(`Solo ${allowedRol} puede tomar decisiones en este estado`);
    }

    // Determine new state
    let newState: EstadoProceso;
    if (!decision.aprobado) {
      newState = EstadoProceso.RECHAZADA;
    } else {
      const transitions = ALLOWED_STATE_TRANSITIONS[proceso.estado];
      newState = transitions.find(s => s !== EstadoProceso.RECHAZADA && s !== EstadoProceso.REQUIERE_CORRECCION) || proceso.estado;
    }

    // Update process
    const updated = await prisma.proceso.update({
      where: { id },
      data: { estado: newState },
    });

    // Create decision record
    await prisma.decision.create({
      data: {
        procesoId: id,
        estadoAnterior: proceso.estado,
        estadoNuevo: newState,
        aprobado: decision.aprobado,
        motivo: decision.motivo,
        usuarioId: userId,
        rol: userRol,
        ipAddress,
        userAgent,
      },
    });

    await this.createAuditEvent(
      id,
      userId,
      decision.aprobado ? TipoEvento.APROBACION : TipoEvento.RECHAZO,
      decision.aprobado ? 'Proceso aprobado' : 'Proceso rechazado',
      { estadoAnterior: proceso.estado, estadoNuevo: newState, motivo: decision.motivo },
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Request correction (Diger)
   */
  async requestCorrection(
    id: string,
    motivo: string,
    userId: string,
    ipAddress: string,
    userAgent: string
  ) {
    const proceso = await prisma.proceso.findUnique({ where: { id } });

    if (!proceso) {
      throw new NotFoundError('Proceso');
    }

    if (proceso.estado !== EstadoProceso.DOCUMENTOS_EN_VALIDACION) {
      throw new ConflictError('Solo se pueden solicitar correcciones durante la validación');
    }

    const updated = await prisma.proceso.update({
      where: { id },
      data: { estado: EstadoProceso.REQUIERE_CORRECCION },
    });

    await prisma.decision.create({
      data: {
        procesoId: id,
        estadoAnterior: proceso.estado,
        estadoNuevo: EstadoProceso.REQUIERE_CORRECCION,
        aprobado: false,
        motivo,
        usuarioId: userId,
        rol: Rol.DIGER,
        ipAddress,
        userAgent,
      },
    });

    await this.createAuditEvent(
      id,
      userId,
      TipoEvento.CORRECCION_SOLICITADA,
      'Correcciones solicitadas',
      { motivo },
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Sign process (Ordenador del Gasto)
   */
  async signProceso(
    id: string,
    userId: string,
    ipAddress: string,
    userAgent: string
  ) {
    const proceso = await prisma.proceso.findUnique({
      where: { id },
      include: { beneficiario: true },
    });

    if (!proceso) {
      throw new NotFoundError('Proceso');
    }

    if (proceso.estado !== EstadoProceso.REVISION_ORDENADOR) {
      throw new ConflictError('El proceso no está listo para firma');
    }

    // Generate PDF - Cast to expected type
    const procesoData = {
      id: proceso.id,
      codigo: proceso.codigo,
      formulario: proceso.formulario as Record<string, unknown> | null,
      beneficiario: {
        nombreCompleto: proceso.beneficiario.nombreCompleto,
        cedula: proceso.beneficiario.cedula,
        email: proceso.beneficiario.email,
      },
      arrendador: null,
      pdfVersion: proceso.pdfVersion,
    };
    const { path: pdfPath, hash: pdfHash } = await pdfService.generatePdf(procesoData);

    // Update with signature info
    const updated = await prisma.proceso.update({
      where: { id },
      data: {
        estado: EstadoProceso.FIRMADA,
        firmado: true,
        firmadoEn: new Date(),
        firmadoPorId: userId,
        firmaHash: pdfHash,
        firmaIp: ipAddress,
        firmaUserAgent: userAgent,
        pdfPath,
        pdfHash,
        pdfVersion: proceso.pdfVersion + 1,
      },
    });

    // Save PDF version history
    await prisma.historialPdf.create({
      data: {
        procesoId: id,
        version: proceso.pdfVersion + 1,
        pdfPath,
        pdfHash,
      },
    });

    await this.createAuditEvent(
      id,
      userId,
      TipoEvento.FIRMA,
      'Proceso firmado electrónicamente',
      { pdfHash, firmaIp: ipAddress },
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Close/finalize process (CRI)
   */
  async closeProceso(
    id: string,
    userId: string,
    ipAddress: string,
    userAgent: string
  ) {
    const proceso = await prisma.proceso.findUnique({ where: { id } });

    if (!proceso) {
      throw new NotFoundError('Proceso');
    }

    if (proceso.estado !== EstadoProceso.FIRMADA) {
      throw new ConflictError('El proceso no está firmado');
    }

    const updated = await prisma.proceso.update({
      where: { id },
      data: {
        estado: EstadoProceso.FINALIZADA,
        cerradoEn: new Date(),
        cerradoPorId: userId,
      },
    });

    await this.createAuditEvent(
      id,
      userId,
      TipoEvento.CIERRE,
      'Proceso finalizado y cerrado',
      {},
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Get process timeline
   */
  async getTimeline(id: string, userId: string, userRol: Rol) {
    const proceso = await prisma.proceso.findUnique({ where: { id } });

    if (!proceso) {
      throw new NotFoundError('Proceso');
    }

    this.checkViewPermission(proceso, userId, userRol);

    const eventos = await prisma.eventoAuditoria.findMany({
      where: { procesoId: id },
      include: {
        usuario: {
          select: { id: true, nombreCompleto: true, rol: true },
        },
      },
      orderBy: { creadoEn: 'asc' },
    });

    return eventos.map(e => ({
      id: e.id,
      tipo: e.tipo,
      descripcion: e.descripcion,
      fecha: e.creadoEn,
      responsable: e.usuario ? {
        rol: e.usuario.rol,
        nombre: userRol !== Rol.BENEFICIARIO && userRol !== Rol.ARRENDADOR
          ? e.usuario.nombreCompleto
          : undefined,
      } : undefined,
      observaciones: e.detalles ? (e.detalles as Record<string, unknown>)['motivo'] as string : undefined,
    }));
  }

  // Private methods

  private checkViewPermission(
    proceso: { beneficiarioId: string; arrendadorId: string | null },
    userId: string,
    userRol: Rol
  ) {
    // Beneficiario can only see their own
    if (userRol === Rol.BENEFICIARIO && proceso.beneficiarioId !== userId) {
      throw new AuthorizationError('No tiene permisos para ver este proceso');
    }

    // Arrendador can only see associated
    if (userRol === Rol.ARRENDADOR && proceso.arrendadorId !== userId) {
      throw new AuthorizationError('No tiene permisos para ver este proceso');
    }

    // Other roles have broader access (already filtered in getProcesos)
  }

  private async createAuditEvent(
    procesoId: string,
    usuarioId: string,
    tipo: TipoEvento,
    descripcion: string,
    detalles: Record<string, unknown>,
    ipAddress: string,
    userAgent: string
  ) {
    await prisma.eventoAuditoria.create({
      data: {
        procesoId,
        usuarioId,
        tipo,
        descripcion,
        detalles: detalles as Prisma.InputJsonValue,
        ipAddress,
        userAgent,
      },
    });
  }
}

export const procesoService = new ProcesoService();
