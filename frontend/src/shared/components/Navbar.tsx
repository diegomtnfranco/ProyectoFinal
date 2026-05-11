import { useState } from 'react'
import { Link } from 'react-router-dom'

import ParkingLogo from '../../assets/logos/Parking-Logo.jpg'

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

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
          Inicio
        </Link>

        <Link to='/reservations' className='text-white hover:text-gray-200'>
          Reservas
        </Link>

        <Link to='/profile' className='text-white hover:text-gray-200'>
          Perfil
        </Link>
      </div>

      <button
        className='md:hidden flex flex-col gap-1'
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className='w-6 h-1 bg-white rounded'></span>
        <span className='w-6 h-1 bg-white rounded'></span>
        <span className='w-6 h-1 bg-white rounded'></span>
      </button>

      {isOpen && (
        <div className='absolute top-16 left-0 w-full bg-white shadow-md flex flex-col p-4 gap-4 md:hidden'>
          <Link to='/'>Inicio</Link>
          <Link to='/reservations'>Reservas</Link>
          <Link to='/profile'>Perfil</Link>
        </div>
      )}
    </nav>
  )
}

export default Navbar