import { create } from 'zustand';
import { User, Role } from '../types';
import { apiRequest, setAuthToken } from '../utils/api';

interface AuthState {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string, sessionMeta?: any) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isReady: false,

  login: async (email, password, sessionMeta) => {
    const data = await apiRequest<{ token: string; user: User }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, sessionMeta })
    });
    setAuthToken(data.token);
    set({ user: data.user, role: data.user.role, isAuthenticated: true, isReady: true });
  },

  logout: () => {
    setAuthToken(null);
    set({ user: null, role: null, isAuthenticated: false, isReady: true });
  },

  initialize: async () => {
    try {
      const data = await apiRequest<{ user: User }>('/api/v1/auth/me');
      set({ user: data.user, role: data.user.role, isAuthenticated: true, isReady: true });
    } catch {
      setAuthToken(null);
      set({ user: null, role: null, isAuthenticated: false, isReady: true });
    }
  }
}));

