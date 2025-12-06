import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from './api';
import { api } from './api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user, isLoading: false }),
      logout: async () => {
        try {
          await api.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ user: null });
        }
      },
      restoreSession: async () => {
        try {
          const { user } = await api.getCurrentUser();
          set({ user, isLoading: false });
        } catch (error) {
          set({ user: null, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // Only persist user, not isLoading
    }
  )
);

// Restore session on app load
if (typeof window !== 'undefined') {
  useAuth.getState().restoreSession();
}
