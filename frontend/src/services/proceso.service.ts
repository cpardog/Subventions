import { api } from './api';

export interface Proceso {
  id: string;
  codigo: string;
  estado: string;
  beneficiario: {
    id: string;
    nombreCompleto: string;
    cedula: string;
    email?: string;
  };
  arrendador?: {
    id: string;
    nombreCompleto: string;
  };
  formulario?: Record<string, unknown>;
  documentos?: Documento[];
  pdfVersion: number;
  firmado: boolean;
  creadoEn: string;
  enviadoEn?: string;
}

export interface Documento {
  id: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  estado: string;
  version: number;
  motivoRechazo?: string;
  catalogo: {
    id: string;
    tipo: string;
    nombre: string;
    obligatorio: boolean;
  };
}

export interface TimelineEvent {
  id: string;
  tipo: string;
  descripcion: string;
  fecha: string;
  responsable?: {
    rol: string;
    nombre?: string;
  };
  observaciones?: string;
}

interface ProcesosResponse {
  procesos: Proceso[];
  total: number;
  page: number;
  limit: number;
}

export const procesoService = {
  async getProcesos(params?: {
    page?: number;
    limit?: number;
    estado?: string;
    search?: string;
  }): Promise<ProcesosResponse> {
    const response = await api.get('/procesos', { params });
    return {
      procesos: response.data.data,
      total: response.data.meta.total,
      page: response.data.meta.page,
      limit: response.data.meta.limit,
    };
  },

  async getProcesoById(id: string): Promise<Proceso> {
    const response = await api.get(`/procesos/${id}`);
    return response.data.data;
  },

  async createProceso(beneficiarioId: string, arrendadorId?: string): Promise<Proceso> {
    const response = await api.post('/procesos', { beneficiarioId, arrendadorId });
    return response.data.data;
  },

  async updateFormulario(id: string, formulario: Record<string, unknown>): Promise<Proceso> {
    const response = await api.patch(`/procesos/${id}/formulario`, { formulario });
    return response.data.data;
  },

  async submitProceso(id: string): Promise<Proceso> {
    const response = await api.post(`/procesos/${id}/submit`);
    return response.data.data;
  },

  async startValidation(id: string): Promise<Proceso> {
    const response = await api.post(`/procesos/${id}/start-validation`);
    return response.data.data;
  },

  async makeDecision(id: string, aprobado: boolean, motivo: string): Promise<Proceso> {
    const response = await api.post(`/procesos/${id}/decision`, { aprobado, motivo });
    return response.data.data;
  },

  async requestCorrection(id: string, motivo: string): Promise<Proceso> {
    const response = await api.post(`/procesos/${id}/request-correction`, { motivo });
    return response.data.data;
  },

  async signProceso(id: string): Promise<Proceso> {
    const response = await api.post(`/procesos/${id}/sign`);
    return response.data.data;
  },

  async closeProceso(id: string): Promise<Proceso> {
    const response = await api.post(`/procesos/${id}/close`);
    return response.data.data;
  },

  async getTimeline(id: string): Promise<TimelineEvent[]> {
    const response = await api.get(`/procesos/${id}/timeline`);
    return response.data.data;
  },
};
