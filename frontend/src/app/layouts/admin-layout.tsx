import { Outlet } from 'react-router-dom'

import Navbar from '../../shared/components/Navbar'
import AdminSideBarMenu from '../../shared/components/AdminSideBarMenu'
import Footer from '../../shared/components/Footer'

function AdminLayout() {
  return (
    <div className='min-h-screen flex flex-col bg-gray-100'>
      <Navbar />

      <div className='md:flex flex-1 w-full gap-4 px-4 py-4'>
        <div className='hidden md:block'>
          <AdminSideBarMenu />
        </div>

        <main className='flex-1 rounded-xl bg-white p-6 shadow-sm border border-gray-200'>
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  )
}

export default AdminLayout