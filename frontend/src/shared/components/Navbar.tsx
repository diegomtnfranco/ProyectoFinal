import { useState } from 'react'
import { Link } from 'react-router-dom'

import ParkingLogo from '../../assets/logos/Parking-Logo.jpg'
import AdminSideBarMenu from './AdminSideBarMenu'

function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileProfileOpen, setIsMobileProfileOpen] =
    useState(false)

  return (
    <nav className='bg-blue-500 shadow-md h-16 px-4 flex items-center justify-between relative z-50'>
      <Link
        to='/'
        className='flex items-center gap-2'
      >
        <img
          src={ParkingLogo}
          alt='Parking Logo'
          className='w-10 h-10 rounded-md'
        />

        <span className='text-white font-bold text-xl'>
          Estacionapp
        </span>
      </Link>

      {/* Desktop */}
      <div className='hidden md:flex items-center gap-6'>
        <span className='text-white font-bold text-xl'>
          Estacionamiento 1
        </span>

        <div className='relative'>
          <button
            onClick={() =>
              setIsMobileProfileOpen(
                !isMobileProfileOpen
              )
            }
          >
            <img
              src='https://i.pravatar.cc/40'
              alt='Perfil'
              className='w-10 h-10 rounded-full border-2 border-white'
            />
          </button>

          {isMobileProfileOpen && (
            <div className='absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg overflow-hidden'>
              <Link
                to='/profile'
                className='block px-4 py-2 hover:bg-gray-100'
              >
                Perfil
              </Link>

              <button className='w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100'>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile */}
      <button
        className='md:hidden flex flex-col gap-1'
        onClick={() =>
          setIsProfileOpen(!isProfileOpen)
        }
      >
        <span className='w-6 h-1 bg-white rounded'></span>
        <span className='w-6 h-1 bg-white rounded'></span>
        <span className='w-6 h-1 bg-white rounded'></span>
      </button>

      {/* Overlay */}
      {isProfileOpen && (
        <div
          className='fixed inset-0 bg-black/40 z-40 md:hidden'
          onClick={() =>
            setIsProfileOpen(false)
          }
        />
      )}

      {/* Drawer Mobile */}
      <div
        className={`
          fixed
          top-16
          left-0
          h-[calc(100vh-4rem)]
          w-72
          bg-white
          z-50
          shadow-xl
          transform
          transition-transform
          duration-300
          md:hidden
          ${
            isProfileOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }
        `}
      >
        <div className='p-4'>
          <AdminSideBarMenu />
        </div>
      </div>
    </nav>
  )
}

export default Navbar