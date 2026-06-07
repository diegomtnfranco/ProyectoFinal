// src/app/router/AppRouter.tsx
import ForgotPassword from '../../features/auth/components/ForgotPassword';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../../features/auth/pages/LoginPage';
import RegisterPage from '../../features/auth/pages/RegisterPage';
import VerifyEmailPage from '../../features/auth/pages/VerifyEmailPage';
import ClientLayout from '../layouts/client-layout';
import ParkingListPage from '../../features/parking-lots/pages/ParkingListPage';
import ParkingDetailsPage from '../../features/parking-lots/pages/ParkingDetailsPage';
import OwnerLayout from '../layouts/owner-layout';
import DashboardOwner from '../../features/owner/Dashboard';
import RatesPage from '../../features/owner/RatesPage';
import UsersPage from '../../features/owner/UsersPage';
import CreateCompanyForm from '../../features/auth/components/CreateCompanyForm';
import CompanyLocationForm from '../../features/auth/components/CompanyLocationForm';
import AdminLayout from '../layouts/admin-layout';
import CompaniesPage from '../../features/admin/pages/CompaniesPage';
import { ProtectedRoute } from '../../shared/components/common/ProtectedRoute';
import { UserRole } from '../../types/auth.types';
import PendingCompaniesPages from '../../features/admin/pages/PendingCompaniesPages'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ============================================ */}
        {/* RUTAS PÚBLICAS - No requieren autenticación */}
        {/* ============================================ */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify" element={<VerifyEmailPage />} />

        {/* ============================================ */}
        {/* RUTAS DE REGISTRO DE EMPRESA - Acceso público */}
        {/* ============================================ */}
        <Route path="/create-company" element={<CreateCompanyForm />} />
        <Route path="/company-location" element={<CompanyLocationForm />} />

        {/* ============================================ */}
        {/* RUTAS PROTEGIDAS POR ROL */}
        {/* ============================================ */}
        
        {/* CLIENTE */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.CLIENT]} redirectTo="/" />}>
          <Route path="/client" element={<ClientLayout />}>
            <Route index element={<ParkingListPage />} />
            <Route path="parking-lots/:id" element={<ParkingDetailsPage />} />
          </Route>
        </Route>

        {/* DUEÑO DE PARKING */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.PARKING_OWNER]} redirectTo="/" />}>
          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<Navigate to="parking" replace />} />
            <Route path="parking" element={<DashboardOwner />} />
            <Route path="rates" element={<RatesPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Route>

        {/* ADMINISTRADOR */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} redirectTo="/" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="companies" replace />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path='actives' element={<PendingCompaniesPages/>}/>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;