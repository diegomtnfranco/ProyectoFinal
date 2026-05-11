import { Outlet } from 'react-router-dom'

import Navbar from '../../shared/components/Navbar'

function ClientLayout() {
  return (
    <div className='min-h-screen bg-gray-100'>
      <Navbar />

      <main className='max-w-7xl mx-auto p-4'>
        <Outlet />
      </main>
    </div>
  )
}

export default ClientLayout