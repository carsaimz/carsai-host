/**
 * CARSAI HOST — Auth store (Zustand)
 * Mantem o utilizador, tokens e accoes de auth.
 * Sincroniza com localStorage e com o api wrapper.
 */
import { create } from 'zustand';
import type { User, AuthSession } from '@carsai/shared';
import { api, setTokens, clearTokens, getRefreshToken } from '@/lib/api';
import { ENDPOINTS } from '@/lib/constants';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Accoes
  login: (email: string, password: string, remember?: boolean, twoFactorCode?: string) => Promise<User>;
  register: (input: Record<string, unknown>) => Promise<{ email: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  fetchMe: () => Promise<User | null>;
  setUser: (user: User | null) => void;
  clear: () => void;
  setError: (err: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password, remember = false, twoFactorCode) => {
    set({ isLoading: true, error: null });
    try {
      const session = await api.post<AuthSession>(
        ENDPOINTS.auth.login,
        { email, password, remember, twoFactorCode },
        { public: true },
      );
      setTokens(session.tokens.accessToken, session.tokens.refreshToken);
      set({
        user: session.user,
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return session.user;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao iniciar sessao';
      set({ isLoading: false, error: msg });
      throw e;
    }
  },

  register: async (input) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(ENDPOINTS.auth.register, input, { public: true });
      set({ isLoading: false });
      return { email: input.email as string };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao registar';
      set({ isLoading: false, error: msg });
      throw e;
    }
  },

  logout: async () => {
    try {
      await api.post(ENDPOINTS.auth.logout, { refreshToken: getRefreshToken() });
    } catch {
      /* ignore network errors on logout */
    }
    clearTokens();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  refresh: async () => {
    // O api wrapper ja faz refresh transparente; este metodo e para uso explicito.
    const token = getRefreshToken();
    if (!token) return false;
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string }>(
        ENDPOINTS.auth.refresh,
        { refreshToken: token },
        { public: true, noRefresh: true },
      );
      setTokens(data.accessToken, data.refreshToken);
      set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return true;
    } catch {
      clearTokens();
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      return false;
    }
  },

  fetchMe: async () => {
    try {
      const user = await api.get<User>(ENDPOINTS.auth.me);
      set({ user, isAuthenticated: true });
      return user;
    } catch {
      set({ user: null, isAuthenticated: false });
      return null;
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clear: () => {
    clearTokens();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, error: null });
  },
  setError: (err) => set({ error: err }),
}));

// Escuta eventos do api wrapper (refresh transparente, sessao expirada)
if (typeof window !== 'undefined') {
  window.addEventListener('carsai:session-expired', () => {
    useAuthStore.getState().clear();
    // Redirect to login (apenas se nao estivermos ja la)
    if (window.location.pathname !== '/login') {
      window.location.href = '/login?expired=1';
    }
  });
}
