import { api, getCsrfToken } from './api';

export interface CatalogoDocumento {
  id: string;
  tipo: string;
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  formatosPermitidos: string[];
}

export interface DocumentoUpload {
  id: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  estado: string;
  catalogo: CatalogoDocumento;
}

export const documentoService = {
  async getCatalogo(): Promise<CatalogoDocumento[]> {
    const response = await api.get('/catalogo/documentos');
    return response.data.data;
  },

  async uploadDocument(
    procesoId: string,
    tipoDocumento: string,
    file: File
  ): Promise<DocumentoUpload> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipoDocumento', tipoDocumento);

    const csrfToken = await getCsrfToken();
    
    const response = await api.post(`/documentos/${procesoId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-CSRF-Token': csrfToken,
      },
    });
    return response.data.data;
  },

  async getDocumentosByProceso(procesoId: string): Promise<DocumentoUpload[]> {
    const response = await api.get(`/documentos/proceso/${procesoId}`);
    return response.data.data;
  },

  async downloadDocument(documentoId: string): Promise<Blob> {
    const response = await api.get(`/documentos/${documentoId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async deleteDocument(documentoId: string): Promise<void> {
    await api.delete(`/documentos/${documentoId}`);
  },

  async validateDocument(
    documentoId: string,
    aprobado: boolean,
    motivo?: string
  ): Promise<DocumentoUpload> {
    const response = await api.post(`/documentos/${documentoId}/validate`, {
      aprobado,
      motivo,
    });
    return response.data.data;
  },
};
