/**
 * useAuth — hook que expoe o auth store + helpers derivados.
 */
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const store = useAuthStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    isAdmin: store.user?.role === 'admin',
    isMod: store.user?.role === 'moderator' || store.user?.role === 'admin',
    login: store.login,
    register: store.register,
    logout: store.logout,
    refresh: store.refresh,
    fetchMe: store.fetchMe,
    setUser: store.setUser,
    clear: store.clear,
  };
}

export default useAuth;
