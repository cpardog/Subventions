import { api } from './api';
import type { Rol } from '@/stores/auth.store';

export interface User {
  id: string;
  cedula: string;
  email: string;
  nombreCompleto: string;
  rol: Rol;
  estado: string;
  mfaHabilitado: boolean;
  creadoEn: string;
  ultimoAcceso?: string;
}

interface UsersResponse {
  users: User[];
  total: number;
}

export interface CreateUserData {
  cedula: string;
  email: string;
  nombreCompleto: string;
  password: string;
  rol: Rol;
}

export interface UpdateUserData {
  nombreCompleto?: string;
  email?: string;
  estado?: 'ACTIVO' | 'INACTIVO';
  rol?: Rol;
}

export const userService = {
  async getUsers(params?: {
    page?: number;
    limit?: number;
    rol?: Rol;
    estado?: string;
    search?: string;
  }): Promise<UsersResponse> {
    const response = await api.get('/users', { params });
    return {
      users: response.data.data,
      total: response.data.meta.total,
    };
  },

  async getUserById(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`);
    return response.data.data;
  },

  async getUsersByRole(rol: Rol): Promise<User[]> {
    const response = await api.get(`/users/by-role/${rol}`);
    return response.data.data;
  },

  async createUser(data: CreateUserData): Promise<User> {
    const response = await api.post('/users', data);
    return response.data.data;
  },

  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const response = await api.patch(`/users/${id}`, data);
    return response.data.data;
  },

  async deactivateUser(id: string): Promise<void> {
    await api.post(`/users/${id}/deactivate`);
  },

  async unlockUser(id: string): Promise<void> {
    await api.post(`/users/${id}/unlock`);
  },
};
