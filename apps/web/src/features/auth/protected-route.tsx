import type { Role } from '@banana/api-client';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';
import { LoadingState } from '@/shared/components/ui';

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Validando sesión…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.rol)) {
    const fallback =
      user.rol === 'ADMIN' ? '/dashboard' : user.rol === 'TECNICO' ? '/inbox' : '/reports';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}

export function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol === 'ADMIN') return <Navigate to="/dashboard" replace />;
  if (user.rol === 'TECNICO') return <Navigate to="/inbox" replace />;
  return <Navigate to="/reports" replace />;
}
