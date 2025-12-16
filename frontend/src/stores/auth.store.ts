import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services/auth.service';

export type Rol = 'BENEFICIARIO' | 'ARRENDADOR' | 'DIGER' | 'DIRECTORA' | 'ORDENADOR_GASTO' | 'CRI';

interface User {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: Rol;
  mfaHabilitado: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresMfa: boolean;
  
  // Actions
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      requiresMfa: false,

      login: async (email: string, password: string, mfaCode?: string) => {
        set({ isLoading: true });
        try {
          const response = await authService.login(email, password, mfaCode);
          
          if (response.requiresMfa) {
            set({ requiresMfa: true, isLoading: false });
            return;
          }

          set({
            user: response.user,
            accessToken: response.accessToken,
            isAuthenticated: true,
            requiresMfa: false,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Ignore logout errors
        } finally {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            requiresMfa: false,
          });
        }
      },

      refreshToken: async () => {
        try {
          const response = await authService.refreshToken();
          set({ accessToken: response.accessToken });
        } catch {
          // If refresh fails, logout
          get().logout();
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      checkAuth: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          const user = await authService.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth check on app load
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth();
}
