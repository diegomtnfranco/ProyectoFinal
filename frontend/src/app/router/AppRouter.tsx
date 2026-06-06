import ForgotPassword from '../../features/auth/components/ForgotPassword'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import LoginPage from '../../features/auth/pages/LoginPage'
import RegisterPage from '../../features/auth/pages/RegisterPage'

import ClientLayout from '../layouts/client-layout'

import ParkingListPage from '../../features/parking-lots/pages/ParkingListPage'
import ParkingDetailsPage from '../../features/parking-lots/pages/ParkingDetailsPage'

import OwnerLayout from '../layouts/owner-layout'
import DashboardOwner from '../../features/owner/Dashboard'
// import RatesPage from '../../features/owner/Rates'

import CreateCompanyForm from '../../features/auth/components/CreateCompanyForm'
import CompanyLocationForm from '../../features/auth/components/CompanyLocationForm'
import AdminLayout from '../layouts/admin-layout'
import CompaniesPage from '../../features/admin/pages/CompaniesPage'
import PendingCompaniesPage from '../../features/admin/pages/PendingCompaniesPages'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        <Route path='/' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />

        {/* CLIENT */}
        <Route path='/client' element={<ClientLayout />}>
          <Route index element={<ParkingListPage />} />
          <Route path='parking-lots/:id' element={<ParkingDetailsPage />} />
        </Route>

        {/* OWNER */}
        <Route path='/create-company' element={<CreateCompanyForm />} />
        <Route path='/company-location' element={<CompanyLocationForm />} />

        <Route path='/owner' element={<OwnerLayout />}>
          <Route index element={<Navigate to='parking' replace />} />
          <Route path='parking' element={<DashboardOwner />} />
          {/* <Route path='rates' element={<RatesPage />} /> */}
          <Route path='users' element={<DashboardOwner />} />
          <Route path='reports' element={<DashboardOwner />} />
          <Route path='settings' element={<DashboardOwner />} />
        </Route>

        {/* ADMIN */}
       <Route path="/admin" element={<AdminLayout />}>
       <Route path="companies" element={<CompaniesPage />} />
        <Route path="actives" element={<PendingCompaniesPage />}
  />
      </Route>

      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter