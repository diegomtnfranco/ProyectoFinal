import { BrowserRouter, Routes, Route } from 'react-router-dom'

import LoginPage from '../../features/auth/pages/LoginPage'
import RegisterPage from '../../features/auth/pages/RegisterPage'

import ClientLayout from '../layouts/client-layout'

import ParkingListPage from '../../features/parking-lots/pages/ParkingListPage'
import ParkingDetailsPage from '../../features/parking-lots/pages/ParkingDetailsPage'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        
        {/* PUBLIC */}
<Route path='/' element={<LoginPage />} />
<Route path='/register' element={<RegisterPage />} /> 
        {/* CLIENT */}
        <Route path='/client' element={<ClientLayout />}>

          <Route
            index
            element={<ParkingListPage />}
          />

          <Route
            path='parking-lots/:id'
            element={<ParkingDetailsPage />}
          />

        </Route>

      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter