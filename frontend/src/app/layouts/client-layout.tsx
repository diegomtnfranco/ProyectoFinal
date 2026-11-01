import { Outlet } from 'react-router-dom'

import Navbar from '../../shared/components/Navbar'
import ClientTrackingListener from '../../features/tracking/components/ClientTrackingListener'

function ClientLayout() {
  return (
    <div className='min-h-screen bg-gray-100'>
      <Navbar />
      {/* Avisos de seguimiento (ingreso, cierre, noche, egreso) en todas las páginas del cliente */}
      <ClientTrackingListener />

      <main className="max-w-7xl mx-auto p-4 pb-24 md:pb-4">
  <Outlet />
</main>
    </div>
  )
}

export default ClientLayout