import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, User, Download, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { procesoService, Documento } from '@/services/proceso.service';
import { documentoService } from '@/services/documento.service';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentUpload } from '@/components/documentos/DocumentUpload';
import { DocumentViewer } from '@/components/documentos/DocumentViewer';
import { cn, ESTADO_LABELS, ESTADO_COLORS, formatDateTime, formatFileSize, ROL_LABELS } from '@/lib/utils';

export function ProcesoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name: string; mimeType: string } | null>(null);

  const handleViewDocument = async (doc: Documento) => {
    try {
      const blob = await documentoService.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      setViewingDoc({ url, name: doc.nombreOriginal, mimeType: doc.mimeType });
    } catch (error) {
      console.error('Error loading document:', error);
    }
  };

  const handleCloseViewer = () => {
    if (viewingDoc) {
      window.URL.revokeObjectURL(viewingDoc.url);
      setViewingDoc(null);
    }
  };

  const { data: proceso, isLoading } = useQuery({
    queryKey: ['proceso', id],
    queryFn: () => procesoService.getProcesoById(id!),
    enabled: !!id,
  });

  const { data: timeline } = useQuery({
    queryKey: ['proceso', id, 'timeline'],
    queryFn: () => procesoService.getTimeline(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!proceso) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Proceso no encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{proceso.codigo}</h1>
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2",
            ESTADO_COLORS[proceso.estado] || 'bg-gray-100 text-gray-800'
          )}>
            {ESTADO_LABELS[proceso.estado] || proceso.estado}
          </span>
        </div>

        {/* Actions based on role and state */}
        <div className="flex gap-2">
          {user?.rol === 'BENEFICIARIO' && proceso.estado === 'BORRADOR' && (
            <Button>Enviar Solicitud</Button>
          )}
          {user?.rol === 'DIGER' && proceso.estado === 'ENVIADA' && (
            <Button>Iniciar Validación</Button>
          )}
          {user?.rol === 'ORDENADOR_GASTO' && proceso.estado === 'REVISION_ORDENADOR' && (
            <Button>Firmar Documento</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Beneficiary info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Datos del Beneficiario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Nombre Completo</p>
                  <p className="font-medium">{proceso.beneficiario.nombreCompleto}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cédula</p>
                  <p className="font-medium">{proceso.beneficiario.cedula}</p>
                </div>
                {proceso.beneficiario.email && (
                  <div>
                    <p className="text-sm text-gray-500">Correo Electrónico</p>
                    <p className="font-medium">{proceso.beneficiario.email}</p>
                  </div>
                )}
              </div>

              {proceso.arrendador && (
                <>
                  <hr className="my-4" />
                  <h4 className="font-medium mb-2">Arrendador</h4>
                  <p>{proceso.arrendador.nombreCompleto}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos
              </CardTitle>
              {/* Show upload button for beneficiario/diger in editable states */}
              {(user?.rol === 'BENEFICIARIO' || user?.rol === 'DIGER') && 
               (proceso.estado === 'BORRADOR' || proceso.estado === 'REQUIERE_CORRECCION') && (
                <DocumentUpload procesoId={proceso.id} />
              )}
            </CardHeader>
            <CardContent>
              {proceso.documentos && proceso.documentos.length > 0 ? (
                <div className="space-y-3">
                  {proceso.documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <div>
                          <p className="font-medium">{doc.catalogo.nombre}</p>
                          <p className="text-sm text-gray-500">
                            {doc.nombreOriginal} • {formatFileSize(doc.tamanoBytes)}
                          </p>
                          {doc.motivoRechazo && (
                            <p className="text-sm text-red-500 mt-1">
                              Motivo: {doc.motivoRechazo}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.estado === 'APROBADO' && (
                          <span title="Aprobado"><CheckCircle className="h-5 w-5 text-green-500" /></span>
                        )}
                        {doc.estado === 'RECHAZADO' && (
                          <span title="Rechazado"><XCircle className="h-5 w-5 text-red-500" /></span>
                        )}
                        {doc.estado === 'PENDIENTE' && (
                          <span title="Pendiente"><Clock className="h-5 w-5 text-yellow-500" /></span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewDocument(doc)}
                          title="Ver documento"
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={async () => {
                            const blob = await documentoService.downloadDocument(doc.id);
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = doc.nombreOriginal;
                            a.click();
                            window.URL.revokeObjectURL(url);
                          }}
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No hay documentos cargados</p>
                  {(user?.rol === 'BENEFICIARIO' || user?.rol === 'DIGER') && 
                   (proceso.estado === 'BORRADOR' || proceso.estado === 'REQUIERE_CORRECCION') && (
                    <p className="text-sm text-gray-400 mt-1">
                      Use el botón "Cargar Documento" para agregar archivos
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Historial
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeline && timeline.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-6">
                    {timeline.map((event, index) => (
                      <div key={event.id} className="relative pl-10">
                        <div className={cn(
                          "absolute left-2 w-5 h-5 rounded-full flex items-center justify-center",
                          index === 0 ? "bg-primary" : "bg-gray-200"
                        )}>
                          {event.tipo === 'APROBACION' && <CheckCircle className="h-3 w-3 text-white" />}
                          {event.tipo === 'RECHAZO' && <XCircle className="h-3 w-3 text-white" />}
                          {event.tipo === 'CORRECCION_SOLICITADA' && <AlertTriangle className="h-3 w-3 text-white" />}
                          {!['APROBACION', 'RECHAZO', 'CORRECCION_SOLICITADA'].includes(event.tipo) && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{event.descripcion}</p>
                          <p className="text-xs text-gray-500">
                            {event.responsable && ROL_LABELS[event.responsable.rol]}
                            {event.responsable?.nombre && ` - ${event.responsable.nombre}`}
                          </p>
                          <p className="text-xs text-gray-400">{formatDateTime(event.fecha)}</p>
                          {event.observaciones && (
                            <p className="text-sm text-gray-600 mt-1 italic">
                              "{event.observaciones}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Sin actividad registrada
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <DocumentViewer
          open={!!viewingDoc}
          onClose={handleCloseViewer}
          documentUrl={viewingDoc.url}
          documentName={viewingDoc.name}
          mimeType={viewingDoc.mimeType}
        />
      )}
    </div>
  );
}
