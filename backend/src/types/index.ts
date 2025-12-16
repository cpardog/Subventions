import { Rol, EstadoProceso, EstadoDocumento, TipoDocumento, TipoEvento } from '@prisma/client';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    nombreCompleto: string;
    rol: Rol;
    mfaHabilitado: boolean;
  };
  requiresMfa?: boolean;
}

export interface TokenPayload {
  sub: string;
  email: string;
  rol: Rol;
  nombreCompleto: string;
  type: 'access' | 'refresh';
  exp?: number;
  iat?: number;
}

// User types
export interface CreateUserRequest {
  cedula: string;
  email: string;
  nombreCompleto: string;
  password: string;
  rol: Rol;
}

export interface UpdateUserRequest {
  nombreCompleto?: string;
  email?: string;
  estado?: 'ACTIVO' | 'INACTIVO';
  rol?: Rol;
}

export interface UserResponse {
  id: string;
  cedula: string;
  email: string;
  nombreCompleto: string;
  rol: Rol;
  estado: string;
  mfaHabilitado: boolean;
  creadoEn: Date;
  ultimoAcceso?: Date;
}

// Process types
export interface CreateProcesoRequest {
  beneficiarioId: string;
  arrendadorId?: string;
}

export interface UpdateProcesoFormularioRequest {
  formulario: Record<string, unknown>;
}

export interface ProcesoResponse {
  id: string;
  codigo: string;
  estado: EstadoProceso;
  beneficiario: {
    id: string;
    nombreCompleto: string;
    cedula: string;
  };
  arrendador?: {
    id: string;
    nombreCompleto: string;
  };
  formulario?: Record<string, unknown>;
  pdfVersion: number;
  firmado: boolean;
  creadoEn: Date;
  enviadoEn?: Date;
}

// Decision types
export interface DecisionRequest {
  aprobado: boolean;
  motivo: string;
}

// Document types
export interface DocumentoResponse {
  id: string;
  tipo: TipoDocumento;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  estado: EstadoDocumento;
  version: number;
  motivoRechazo?: string;
  cargadoEn: Date;
  validadoEn?: Date;
}

export interface ValidateDocumentRequest {
  aprobado: boolean;
  motivo?: string;
}

// Audit types
export interface EventoAuditoriaResponse {
  id: string;
  tipo: TipoEvento;
  descripcion: string;
  detalles?: Record<string, unknown>;
  usuario?: {
    id: string;
    nombreCompleto: string;
    rol: Rol;
  };
  creadoEn: Date;
}

// Timeline types
export interface TimelineEvent {
  id: string;
  tipo: TipoEvento;
  descripcion: string;
  fecha: Date;
  responsable: {
    rol: Rol;
    nombre?: string;
  };
  observaciones?: string;
}

// Catalog types
export interface CatalogoDocumentoResponse {
  id: string;
  tipo: TipoDocumento;
  nombre: string;
  descripcion?: string;
  obligatorio: boolean;
  formatosPermitidos: string[];
  tamanoMaximoMb: number;
  vigenciaDias?: number;
}

// Process state machine
export const ALLOWED_STATE_TRANSITIONS: Record<EstadoProceso, EstadoProceso[]> = {
  BORRADOR: [EstadoProceso.ENVIADA],
  ENVIADA: [EstadoProceso.DOCUMENTOS_EN_VALIDACION],
  DOCUMENTOS_EN_VALIDACION: [
    EstadoProceso.VALIDADA_DIGER,
    EstadoProceso.REQUIERE_CORRECCION,
    EstadoProceso.RECHAZADA,
  ],
  REQUIERE_CORRECCION: [EstadoProceso.DOCUMENTOS_EN_VALIDACION],
  VALIDADA_DIGER: [EstadoProceso.REVISION_DIRECTORA, EstadoProceso.RECHAZADA],
  REVISION_DIRECTORA: [EstadoProceso.REVISION_ORDENADOR, EstadoProceso.RECHAZADA],
  REVISION_ORDENADOR: [EstadoProceso.FIRMADA, EstadoProceso.RECHAZADA],
  FIRMADA: [EstadoProceso.FINALIZADA],
  FINALIZADA: [],
  RECHAZADA: [],
};

// Role that can approve each state
export const STATE_APPROVAL_ROLES: Partial<Record<EstadoProceso, Rol>> = {
  DOCUMENTOS_EN_VALIDACION: Rol.DIGER,
  VALIDADA_DIGER: Rol.DIGER,
  REVISION_DIRECTORA: Rol.DIRECTORA,
  REVISION_ORDENADOR: Rol.ORDENADOR_GASTO,
  FIRMADA: Rol.CRI,
};
