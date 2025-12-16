import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  DOCUMENTOS_EN_VALIDACION: 'Documentos en Validación',
  REQUIERE_CORRECCION: 'Requiere Corrección',
  VALIDADA_DIGER: 'Validada por DIGER',
  REVISION_DIRECTORA: 'Revisión Directora',
  REVISION_ORDENADOR: 'Revisión Ordenador',
  FIRMADA: 'Firmada',
  FINALIZADA: 'Finalizada',
  RECHAZADA: 'Rechazada',
};

export const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-800',
  ENVIADA: 'bg-blue-100 text-blue-800',
  DOCUMENTOS_EN_VALIDACION: 'bg-yellow-100 text-yellow-800',
  REQUIERE_CORRECCION: 'bg-orange-100 text-orange-800',
  VALIDADA_DIGER: 'bg-green-100 text-green-800',
  REVISION_DIRECTORA: 'bg-purple-100 text-purple-800',
  REVISION_ORDENADOR: 'bg-indigo-100 text-indigo-800',
  FIRMADA: 'bg-emerald-100 text-emerald-800',
  FINALIZADA: 'bg-teal-100 text-teal-800',
  RECHAZADA: 'bg-red-100 text-red-800',
};

export const ROL_LABELS: Record<string, string> = {
  BENEFICIARIO: 'Beneficiario',
  ARRENDADOR: 'Arrendador',
  DIGER: 'DIGER',
  DIRECTORA: 'Directora',
  ORDENADOR_GASTO: 'Ordenador del Gasto',
  CRI: 'CRI',
};
