// frontend/src/shared/components/common/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { type UserRoleType } from '../../../types/auth.types';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  allowedRoles?: UserRoleType[];
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  allowedRoles, 
  redirectTo = '/' 
}: ProtectedRouteProps) => {
  const { user, token, isLoading } = useAuthStore();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Dar tiempo para que Zustand hidrate el estado
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // No mostrar nada mientras verificamos
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  // Log para debug
  console.log('ProtectedRoute - location:', location.pathname);
  console.log('ProtectedRoute - user:', user);
  console.log('ProtectedRoute - token:', token);

  // Si no hay token o usuario, redirigir
  if (!token || !user) {
    console.log('No authenticated, redirecting to', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // Verificar roles
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleRoutes: Record<UserRoleType, string> = {
      client: '/client',
      parking_owner: '/owner',
      parking_employee: '/employee',
      admin: '/admin/companies',
    };
    const redirectPath = roleRoutes[user.role] || '/';
    console.log(`Role not allowed. Redirecting to ${redirectPath}`);
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};