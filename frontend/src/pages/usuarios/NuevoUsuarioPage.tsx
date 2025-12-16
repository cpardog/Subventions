import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { userService, type CreateUserData } from '@/services/user.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const userSchema = z.object({
  cedula: z.string().min(6, 'Cédula debe tener al menos 6 caracteres'),
  email: z.string().email('Email inválido'),
  nombreCompleto: z.string().min(3, 'Nombre debe tener al menos 3 caracteres'),
  password: z.string().min(10, 'Contraseña debe tener al menos 10 caracteres'),
  rol: z.enum(['BENEFICIARIO', 'ARRENDADOR', 'DIGER', 'DIRECTORA', 'ORDENADOR_GASTO', 'CRI']),
});

type UserForm = z.infer<typeof userSchema>;

export function NuevoUsuarioPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      rol: 'BENEFICIARIO',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserData) => userService.createUser(data),
    onSuccess: () => {
      toast({
        title: 'Usuario creado',
        description: 'El usuario ha sido creado correctamente',
      });
      navigate('/usuarios');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al crear usuario',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: UserForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate('/usuarios')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a usuarios
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo Usuario</CardTitle>
          <CardDescription>
            Complete los datos para crear un nuevo usuario en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cedula">Cédula de Identidad *</Label>
                <Input
                  id="cedula"
                  placeholder="12345678-9"
                  {...register('cedula')}
                />
                {errors.cedula && (
                  <p className="text-sm text-red-500">{errors.cedula.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombreCompleto">Nombre Completo *</Label>
              <Input
                id="nombreCompleto"
                placeholder="Juan Pérez González"
                {...register('nombreCompleto')}
              />
              {errors.nombreCompleto && (
                <p className="text-sm text-red-500">{errors.nombreCompleto.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rol">Rol *</Label>
              <select
                id="rol"
                {...register('rol')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="BENEFICIARIO">Beneficiario</option>
                <option value="ARRENDADOR">Arrendador</option>
                <option value="DIGER">DIGER</option>
                <option value="DIRECTORA">Directora</option>
                <option value="ORDENADOR_GASTO">Ordenador del Gasto</option>
                <option value="CRI">CRI</option>
              </select>
              {errors.rol && (
                <p className="text-sm text-red-500">{errors.rol.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 10 caracteres"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
              <p className="text-sm text-gray-500">
                La contraseña debe tener al menos 10 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/usuarios')}
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
                  'Crear Usuario'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
