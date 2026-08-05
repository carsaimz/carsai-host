/**
 * Route guards para o router.
 * - PublicOnly: redireciona para /dashboard se ja autenticado
 * - Protected: redireciona para /login se nao autenticado
 * - AdminOnly: redireciona para /dashboard se nao for admin
 */
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@carsai/shared';

export function PublicOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to={ROUTES.DASHBOARD} replace />;
  return <>{children}</>;
}

export function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location.pathname }} />;
  }
  if (!isAdmin) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return <>{children}</>;
}
