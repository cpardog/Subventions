import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { procesoService } from '@/services/proceso.service';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, ESTADO_LABELS, ESTADO_COLORS, formatDate } from '@/lib/utils';

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['procesos', 'dashboard'],
    queryFn: () => procesoService.getProcesos({ limit: 5 }),
  });

  // Calculate stats based on user role
  const stats = data?.procesos ? {
    total: data.total,
    pendientes: data.procesos.filter(p => 
      ['BORRADOR', 'ENVIADA', 'DOCUMENTOS_EN_VALIDACION', 'REQUIERE_CORRECCION'].includes(p.estado)
    ).length,
    aprobados: data.procesos.filter(p => 
      ['FIRMADA', 'FINALIZADA'].includes(p.estado)
    ).length,
    rechazados: data.procesos.filter(p => p.estado === 'RECHAZADA').length,
  } : { total: 0, pendientes: 0, aprobados: 0, rechazados: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Bienvenido, {user?.nombreCompleto}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Procesos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendientes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aprobados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rechazados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Processes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Procesos Recientes</CardTitle>
          <Link to="/procesos">
            <Button variant="outline" size="sm">Ver todos</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : data?.procesos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-gray-500">No hay procesos registrados</p>
              {user?.rol === 'DIGER' && (
                <Link to="/procesos/nuevo" className="mt-4">
                  <Button>Crear Nuevo Proceso</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {data?.procesos.map((proceso) => (
                <Link
                  key={proceso.id}
                  to={`/procesos/${proceso.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{proceso.codigo}</p>
                      <p className="text-sm text-gray-500">
                        {proceso.beneficiario.nombreCompleto}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        ESTADO_COLORS[proceso.estado] || 'bg-gray-100 text-gray-800'
                      )}>
                        {ESTADO_LABELS[proceso.estado] || proceso.estado}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(proceso.creadoEn)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
