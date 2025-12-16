import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, UserX, Unlock, UserCheck, Users, UserMinus, Lock } from 'lucide-react';
import { userService, User, UpdateUserData } from '@/services/user.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, ROL_LABELS, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

type TabFilter = 'TODOS' | 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: 'bg-green-100 text-green-800',
  INACTIVO: 'bg-gray-100 text-gray-800',
  BLOQUEADO: 'bg-red-100 text-red-800',
};

export function UsuariosPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabFilter>('TODOS');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateUserData>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, activeTab],
    queryFn: () => userService.getUsers({ 
      page, 
      limit: 10, 
      search: search || undefined,
      estado: activeTab === 'TODOS' ? undefined : activeTab,
    }),
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabFilter);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / 10) : 0;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      toast({ title: 'Usuario actualizado', description: 'Los cambios se guardaron correctamente.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => userService.deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Usuario desactivado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => userService.unlockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Usuario desbloqueado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      nombreCompleto: user.nombreCompleto,
      email: user.email,
      rol: user.rol,
      estado: user.estado as 'ACTIVO' | 'INACTIVO',
    });
  };

  const handleSaveEdit = () => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: editFormData });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-gray-500">Gestión de usuarios del sistema</p>
        </div>

        <Link to="/usuarios/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </Link>
      </div>

      {/* Tabs and Search */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
              <TabsTrigger value="TODOS" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Todos</span>
              </TabsTrigger>
              <TabsTrigger value="ACTIVO" className="gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="hidden sm:inline">Activos</span>
              </TabsTrigger>
              <TabsTrigger value="INACTIVO" className="gap-2">
                <UserMinus className="h-4 w-4 text-gray-600" />
                <span className="hidden sm:inline">Inactivos</span>
              </TabsTrigger>
              <TabsTrigger value="BLOQUEADO" className="gap-2">
                <Lock className="h-4 w-4 text-red-600" />
                <span className="hidden sm:inline">Bloqueados</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, cédula o email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* User list */}
      <Card>
        <CardHeader>
          <CardTitle>
            {data?.total ?? 0} usuario{(data?.total ?? 0) !== 1 ? 's' : ''} encontrado{(data?.total ?? 0) !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : data?.users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Nombre</th>
                    <th className="text-left py-3 px-4 font-medium">Cédula</th>
                    <th className="text-left py-3 px-4 font-medium">Rol</th>
                    <th className="text-left py-3 px-4 font-medium">Estado</th>
                    <th className="text-left py-3 px-4 font-medium">Creado</th>
                    <th className="text-left py-3 px-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{user.nombreCompleto}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">{user.cedula}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {ROL_LABELS[user.rol] || user.rol}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          ESTADO_BADGE[user.estado] || 'bg-gray-100 text-gray-800'
                        )}>
                          {user.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(user.creadoEn)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          {user.estado === 'ACTIVO' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('¿Está seguro de desactivar este usuario?')) {
                                  deactivateMutation.mutate(user.id);
                                }
                              }}
                              title="Desactivar"
                            >
                              <UserX className="h-4 w-4 text-orange-600" />
                            </Button>
                          )}
                          {user.estado === 'INACTIVO' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                updateMutation.mutate({ id: user.id, data: { estado: 'ACTIVO' } });
                              }}
                              title="Reactivar"
                            >
                              <UserCheck className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {user.estado === 'BLOQUEADO' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unlockMutation.mutate(user.id)}
                              title="Desbloquear"
                            >
                              <Unlock className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
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
      {/* Edit Modal */}
      <Dialog open={!!editingUser} onOpenChange={(open: boolean) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombreCompleto">Nombre Completo</Label>
              <Input
                id="nombreCompleto"
                value={editFormData.nombreCompleto || ''}
                onChange={(e) => setEditFormData({ ...editFormData, nombreCompleto: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editFormData.email || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <Select
                value={editFormData.rol}
                onValueChange={(value) => setEditFormData({ ...editFormData, rol: value as UpdateUserData['rol'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BENEFICIARIO">Beneficiario</SelectItem>
                  <SelectItem value="ARRENDADOR">Arrendador</SelectItem>
                  <SelectItem value="DIGER">DIGER</SelectItem>
                  <SelectItem value="DIRECTORA">Directora</SelectItem>
                  <SelectItem value="ORDENADOR_GASTO">Ordenador del Gasto</SelectItem>
                  <SelectItem value="CRI">CRI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={editFormData.estado}
                onValueChange={(value) => setEditFormData({ ...editFormData, estado: value as 'ACTIVO' | 'INACTIVO' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVO">Activo</SelectItem>
                  <SelectItem value="INACTIVO">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
