import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { procesoService } from '@/services/proceso.service';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, ESTADO_LABELS, ESTADO_COLORS, formatDate } from '@/lib/utils';

export function ProcesosPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['procesos', page, search],
    queryFn: () => procesoService.getProcesos({ page, limit: 10, search: search || undefined }),
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Procesos</h1>
          <p className="text-gray-500">Gestión de solicitudes de subvención</p>
        </div>

        {user?.rol === 'DIGER' && (
          <Link to="/procesos/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proceso
            </Button>
          </Link>
        )}
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por código o beneficiario..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Process list */}
      <Card>
        <CardHeader>
          <CardTitle>
            {data?.total ?? 0} proceso{(data?.total ?? 0) !== 1 ? 's' : ''} encontrado{(data?.total ?? 0) !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : data?.procesos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron procesos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Código</th>
                    <th className="text-left py-3 px-4 font-medium">Beneficiario</th>
                    <th className="text-left py-3 px-4 font-medium">Estado</th>
                    <th className="text-left py-3 px-4 font-medium">Fecha</th>
                    <th className="text-left py-3 px-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.procesos.map((proceso) => (
                    <tr key={proceso.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{proceso.codigo}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p>{proceso.beneficiario.nombreCompleto}</p>
                          <p className="text-sm text-gray-500">{proceso.beneficiario.cedula}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          ESTADO_COLORS[proceso.estado] || 'bg-gray-100 text-gray-800'
                        )}>
                          {ESTADO_LABELS[proceso.estado] || proceso.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(proceso.creadoEn)}
                      </td>
                      <td className="py-3 px-4">
                        <Link to={`/procesos/${proceso.id}`}>
                          <Button variant="ghost" size="sm">Ver</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
