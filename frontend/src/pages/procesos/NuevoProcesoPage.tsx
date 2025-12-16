import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { userService } from '@/services/user.service';
import { procesoService } from '@/services/proceso.service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export function NuevoProcesoPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [beneficiarioId, setBeneficiarioId] = useState('');
  const [arrendadorId, setArrendadorId] = useState('');

  const { data: beneficiarios } = useQuery({
    queryKey: ['users', 'BENEFICIARIO'],
    queryFn: () => userService.getUsersByRole('BENEFICIARIO'),
  });

  const { data: arrendadores } = useQuery({
    queryKey: ['users', 'ARRENDADOR'],
    queryFn: () => userService.getUsersByRole('ARRENDADOR'),
  });

  const createMutation = useMutation({
    mutationFn: () => procesoService.createProceso(beneficiarioId, arrendadorId || undefined),
    onSuccess: (proceso) => {
      toast({
        title: 'Proceso creado',
        description: `Se ha creado el proceso ${proceso.codigo}`,
      });
      navigate(`/procesos/${proceso.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al crear proceso',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiarioId) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un beneficiario',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate('/procesos')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a procesos
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo Proceso de Subvención</CardTitle>
          <CardDescription>
            Complete los datos para crear un nuevo proceso de solicitud de subvención
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="beneficiario">Beneficiario *</Label>
              <select
                id="beneficiario"
                value={beneficiarioId}
                onChange={(e) => setBeneficiarioId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="">Seleccione un beneficiario</option>
                {beneficiarios?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nombreCompleto} - {user.cedula}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500">
                Si el beneficiario no existe, debe crearlo primero en la sección de usuarios
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrendador">Arrendador (opcional)</Label>
              <select
                id="arrendador"
                value={arrendadorId}
                onChange={(e) => setArrendadorId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Sin arrendador</option>
                {arrendadores?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nombreCompleto}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/procesos')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Proceso'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
