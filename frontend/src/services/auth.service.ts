import { api } from './api';
import type { Rol } from '@/stores/auth.store';

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    nombreCompleto: string;
    rol: Rol;
    mfaHabilitado: boolean;
  };
  requiresMfa?: boolean;
}

interface User {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: Rol;
  mfaHabilitado: boolean;
}

export const authService = {
  async login(email: string, password: string, mfaCode?: string): Promise<LoginResponse> {
    const response = await api.post('/auth/login', { email, password, mfaCode });
    return response.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    const response = await api.post('/auth/refresh');
    return response.data.data;
  },

  async getMe(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, newPassword });
  },

  async setupMfa(): Promise<{ secret: string; qrCode: string }> {
    const response = await api.post('/auth/mfa/setup');
    return response.data.data;
  },

  async verifyMfa(code: string): Promise<void> {
    await api.post('/auth/mfa/verify', { code });
  },

  async disableMfa(password: string): Promise<void> {
    await api.post('/auth/mfa/disable', { password });
  },
};
