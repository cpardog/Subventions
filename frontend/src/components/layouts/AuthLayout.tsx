import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Subvenciones</h1>
          <p className="text-gray-600 mt-2">Gestión de Subvenciones Económicas</p>
        </div>
        {children}
      </div>
    </div>
  );
}
