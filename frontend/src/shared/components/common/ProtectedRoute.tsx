// import { Navigate, Outlet } from 'react-router-dom';
// import { useAuthStore } from '../../../stores/authStore';
// import { UserRole, type UserRoleType } from '../../../types/auth.types';
// import { Loader2 } from 'lucide-react';

// interface ProtectedRouteProps {
//   allowedRoles?: UserRoleType[];
//   redirectTo?: string;
// }

// export const ProtectedRoute = ({ 
//   allowedRoles, 
//   redirectTo = '/' 
// }: ProtectedRouteProps) => {
//   const { user, isLoading } = useAuthStore();

//   // Mostrar loading mientras se verifica autenticación
//   if (isLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
//       </div>
//     );
//   }

//   // Si no hay usuario autenticado, redirigir al login
//   if (!user) {
//     return <Navigate to={redirectTo} replace />;
//   }

//   // Si se especifican roles, verificar que el usuario tenga uno permitido
//   if (allowedRoles && !allowedRoles.includes(user.role)) {
//     // Redirigir según el rol del usuario
//     if (user.role === UserRole.CLIENT) {
//       return <Navigate to="/client" replace />;
//     }
//     if (user.role === UserRole.PARKING_OWNER) {
//       return <Navigate to="/owner" replace />;
//     }
//     if (user.role === UserRole.ADMIN) {
//       return <Navigate to="/admin/companies" replace />;
//     }
//     return <Navigate to="/" replace />;
//   }

//   // Si todo está bien, renderizar la ruta hija
//   return <Outlet />;
// };

// src/shared/components/common/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { type UserRoleType } from '../../../types/auth.types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRoleType[];
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  allowedRoles, 
  redirectTo = '/' 
}: ProtectedRouteProps) => {
  const { user, isLoading } = useAuthStore();

  // Mostrar loading mientras se verifica autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Si se especifican roles, verificar que el usuario tenga uno permitido
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirigir según el rol del usuario
    const roleRoutes: Record<UserRoleType, string> = {
      client: '/client',
      parking_owner: '/owner',
      parking_employee: '/employee',
      admin: '/admin/companies',
    };
    
    const redirectPath = roleRoutes[user.role] || '/';
    return <Navigate to={redirectPath} replace />;
  }

  // Si todo está bien, renderizar la ruta hija
  return <Outlet />;
};