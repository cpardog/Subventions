import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Shield, Key } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ROL_LABELS } from '@/lib/utils';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z.string().min(10, 'Nueva contraseña debe tener al menos 10 caracteres'),
  confirmPassword: z.string().min(1, 'Confirme la nueva contraseña'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export function PerfilPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [mfaData, setMfaData] = useState<{ secret: string; qrCode: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onChangePassword = async (data: PasswordForm) => {
    setIsChangingPassword(true);
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      toast({
        title: 'Contraseña actualizada',
        description: 'Su contraseña ha sido actualizada correctamente',
      });
      reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al cambiar contraseña',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSetupMfa = async () => {
    setIsSettingUpMfa(true);
    try {
      const data = await authService.setupMfa();
      setMfaData(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al configurar MFA',
        variant: 'destructive',
      });
    } finally {
      setIsSettingUpMfa(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="text-gray-500">Gestione su información personal y seguridad</p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Nombre Completo</p>
              <p className="font-medium">{user?.nombreCompleto}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Correo Electrónico</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Rol</p>
              <p className="font-medium">{user?.rol ? ROL_LABELS[user.rol] : ''}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">MFA</p>
              <p className="font-medium">
                {user?.mfaHabilitado ? (
                  <span className="text-green-600">Habilitado</span>
                ) : (
                  <span className="text-gray-400">No habilitado</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>
            Actualice su contraseña periódicamente para mantener su cuenta segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords ? 'text' : 'password'}
                  {...register('currentPassword')}
                />
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-red-500">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords ? 'text' : 'password'}
                  {...register('newPassword')}
                />
              </div>
              {errors.newPassword && (
                <p className="text-sm text-red-500">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords ? 'text' : 'password'}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Cambiar Contraseña'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* MFA Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autenticación de Dos Factores (MFA)
          </CardTitle>
          <CardDescription>
            Añada una capa extra de seguridad a su cuenta usando una aplicación autenticadora
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user?.mfaHabilitado ? (
            <div className="space-y-4">
              <p className="text-green-600 font-medium">
                ✓ MFA está habilitado en su cuenta
              </p>
              <Button variant="destructive">
                Deshabilitar MFA
              </Button>
            </div>
          ) : mfaData ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Escanee el código QR con su aplicación autenticadora (Google Authenticator, Authy, etc.)
              </p>
              <div className="flex justify-center">
                <img src={mfaData.qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-sm text-gray-500 text-center">
                O ingrese este código manualmente: <code className="bg-gray-100 px-2 py-1 rounded">{mfaData.secret}</code>
              </p>
              <div className="flex justify-center">
                <Button onClick={() => setMfaData(null)}>
                  Verificar y Habilitar
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={handleSetupMfa} disabled={isSettingUpMfa}>
              {isSettingUpMfa ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configurando...
                </>
              ) : (
                'Configurar MFA'
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
