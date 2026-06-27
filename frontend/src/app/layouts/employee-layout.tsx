import { Outlet } from 'react-router-dom'

import Navbar from '../../shared/components/Navbar'
// import SideBarMenu from '../../shared/components/SideBarMenu'
import SideBarMenuEmployee from '../../shared/components/SideBarMenuEmployee'
import Footer from '../../shared/components/Footer'

function EmployeeLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />

      <div className="md:flex flex-1 w-full gap-4 px-4 py-4">
        <div className="hidden md:block">
          <SideBarMenuEmployee />
        </div>

        <div className="flex-1 rounded-lg bg-slate-50 p-4 shadow-sm">
          <Outlet />
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default EmployeeLayout