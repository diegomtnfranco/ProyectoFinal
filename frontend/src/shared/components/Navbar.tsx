import { useState } from 'react'
import { Link } from 'react-router-dom'

import ParkingLogo from '../../assets/logos/Parking-Logo.jpg'

function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  
  return (
    <nav className='bg-blue-500 shadow-md h-16 px-4 flex items-center justify-between relative'>
      <Link to='/' className='flex items-center gap-2'>
        <img
          src={ParkingLogo}
          alt='Parking Logo'
          className='w-10 h-10 rounded-md'
        />
      
        <span className='text-white font-bold text-xl'>ParkLogo</span>
      </Link>

      


      <div className='hidden md:flex items-center gap-6'>
  <Link to='/' className='text-white hover:text-gray-200'>
    <span className='text-white font-bold text-xl'>Estacionamiento 1</span>
  </Link>

  <div className='relative'>
    <button
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className='flex items-center justify-center'
    >
      <img
        src='https://i.pravatar.cc/40'
        alt='Perfil'
        className='w-10 h-10 rounded-full border-2 border-white'
      />
    </button>

    {isMobileMenuOpen && (
      <div className='absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg overflow-hidden z-50'>
        <Link
          to='/profile'
          className='block px-4 py-2 hover:bg-gray-100 text-gray-700'
        >
          Perfil
        </Link>

        <button
          className='w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500'
        >
          Cerrar sesión
        </button>
      </div>
    )}
  </div>
</div>

      <button
        className='md:hidden flex flex-col gap-1'
        onClick={() => setIsProfileOpen(!isProfileOpen)}
      >
        <span className='w-6 h-1 bg-white rounded'></span>
        <span className='w-6 h-1 bg-white rounded'></span>
        <span className='w-6 h-1 bg-white rounded'></span>
      </button>

      {isProfileOpen && (
        <div className='absolute top-16 left-0 w-full bg-white shadow-md flex flex-col p-4 gap-4 md:hidden'>
          <Link to='/'>Inicio</Link>
          <Link to='/profile'>Perfil</Link>

<button className='text-left text-red-500'>
  Cerrar sesión
</button>
        </div>
      )}
    </nav>
  )
}

export default Navbar