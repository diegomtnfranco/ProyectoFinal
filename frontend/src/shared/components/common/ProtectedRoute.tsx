import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  allowedRoles: Array<'client' | 'parking_owner' | 'parking_employee' | 'admin'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, token, isLoading } = useAuth();

  // Si está cargando, mostrar spinner
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Si no hay token ni usuario, redirigir al login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Si el rol no está permitido, redirigir al inicio
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
