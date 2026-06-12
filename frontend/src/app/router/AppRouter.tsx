// src/app/router/AppRouter.tsx
import ForgotPassword from '../../features/auth/components/ForgotPassword';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../../features/auth/pages/LoginPage';
import RegisterPage from '../../features/auth/pages/RegisterPage';
import VerifyEmailPage from '../../features/auth/pages/VerifyEmailPage';
import LandingPage from '../../features/landing/pages/LandingPage' 
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
import MyReservationsPage from '../../features/parking-lots/pages/MyReservationsPage';
import ProfilePage from '../../features/profile/pages/ProfilePage';
import PendingCompaniesPages from '../../features/admin/pages/PendingCompaniesPages'
import EmployeesPage from '../../features/owner/EmployeesPage';

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* RUTAS PÚBLICAS */}
        <Route path='/' element={<LandingPage />} />       
        <Route path='/login' element={<LoginPage />} /> 
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify" element={<VerifyEmailPage />} />
        <Route path="/create-company" element={<CreateCompanyForm />} />
        <Route path="/company-location" element={<CompanyLocationForm />} />

        {/* PUBLIC */}
        <Route path='/' element={<LandingPage />} />       
        <Route path='/login' element={<LoginPage />} />    
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/verify' element={<VerifyEmailPage />} /> 

        {/* CLIENTE */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.CLIENT]} redirectTo="/" />}>
          <Route path="/client" element={<ClientLayout />}>
            <Route index element={<ParkingListPage />} />
            <Route path="parking-lots/:id" element={<ParkingDetailsPage />} />
            <Route path="my-reservations" element={<MyReservationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

        </Route>

        {/* DUEÑO */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.PARKING_OWNER]} redirectTo="/" />}>
          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<Navigate to="parking" replace />} />
            <Route path="parking" element={<DashboardOwner />} />
            <Route path="rates" element={<RatesPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} redirectTo="/" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="companies" replace />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path='actives' element={<PendingCompaniesPages/>}/>
          </Route>
        </Route>

        {/* EMPLEADO */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.PARKING_EMPLOYEE]} redirectTo="/" />}>
          <Route path="/employee" element={<OwnerLayout />}>
            <Route index element={<Navigate to="parking" replace />} />
            <Route path="parking" element={<DashboardOwner />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;