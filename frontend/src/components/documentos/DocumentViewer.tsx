import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface DocumentViewerProps {
  open: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  mimeType: string;
}

export function DocumentViewer({
  open,
  onClose,
  documentUrl,
  documentName,
  mimeType,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = documentUrl;
    a.download = documentName;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h3 className="font-medium truncate max-w-md" title={documentName}>
            {documentName}
          </h3>
          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <Button variant="ghost" size="sm" onClick={handleZoomOut} title="Reducir">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-500 min-w-[50px] text-center">{zoom}%</span>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} title="Ampliar">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRotate} title="Rotar">
                  <RotateCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
              </>
            )}
            <Button variant="ghost" size="sm" onClick={handleDownload} title="Descargar">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} title="Cerrar">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
          {isPdf && (
            <iframe
              src={`${documentUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0 bg-white"
              title={documentName}
            />
          )}
          {isImage && (
            <div className="flex items-center justify-center overflow-auto w-full h-full">
              <img
                src={documentUrl}
                alt={documentName}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease',
                  maxWidth: zoom > 100 ? 'none' : '100%',
                  maxHeight: zoom > 100 ? 'none' : '100%',
                }}
                className="object-contain"
              />
            </div>
          )}
          {!isPdf && !isImage && (
            <div className="text-center text-gray-500">
              <p className="mb-4">No se puede previsualizar este tipo de archivo.</p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Descargar archivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
