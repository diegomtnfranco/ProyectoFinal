import ForgotPassword from '../../features/auth/components/ForgotPassword'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import LoginPage from '../../features/auth/pages/LoginPage'
import RegisterPage from '../../features/auth/pages/RegisterPage'

import ClientLayout from '../layouts/client-layout'

import ParkingListPage from '../../features/parking-lots/pages/ParkingListPage'
import ParkingDetailsPage from '../../features/parking-lots/pages/ParkingDetailsPage'
import OwnerLayout from '../layouts/owner-layout'
import DashboardOwner from '../../features/owner/Dashboard'

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
        <Route path='/owner' element={<OwnerLayout />}>
          <Route index element={<Navigate to='parking' replace />} />
          <Route path='parking' element={<DashboardOwner />} />          
          <Route path='users' element={<DashboardOwner />} />
          <Route path='reports' element={<DashboardOwner />} />
          <Route path='settings' element={<DashboardOwner />} />
        </Route>

      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter