
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import ParkingLogo from '../../assets/logos/Parking-Logo.jpg';

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Obtener el nombre del estacionamiento o rol para mostrar
  const getDisplayName = () => {
    if (user?.role === 'parking_owner') {
      return 'Mi Estacionamiento';
    }
    if (user?.role === 'parking_employee') {
      return 'Mi Trabajo';
    }
    return 'Parking App';
  };

  return (
    <nav className='bg-blue-500 shadow-md h-16 px-4 flex items-center justify-between relative'>
      <Link to='/' className='flex items-center gap-2'>
        <img
          src={ParkingLogo}
          alt='Parking Logo'
          className='w-10 h-10 rounded-md'
        />
        <span className='text-white font-bold text-xl'>{getDisplayName()}</span>
      </Link>

      {/* Desktop Menu */}
      <div className='hidden md:flex items-center gap-6'>
        <Link to='/' className='text-white hover:text-gray-200'>
          <span className='text-white font-medium'>Inicio</span>
        </Link>

        {/* Profile Dropdown */}
        <div className='relative'>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className='flex items-center justify-center'
          >
            <img
              src={user?.avatarUrl || 'https://i.pravatar.cc/40'}
              alt='Perfil'
              className='w-10 h-10 rounded-full border-2 border-white object-cover'
            />
          </button>

          {isMobileMenuOpen && (
            <div className='absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-50'>
              <div className='px-4 py-2 border-b border-gray-100'>
                <p className='text-sm font-medium text-gray-900'>
                  {user?.email || 'Usuario'}
                </p>
                <p className='text-xs text-gray-500 capitalize'>
                  {user?.role?.replace('_', ' ') || 'Sin rol'}
                </p>
              </div>
              
              <Link
                to='/profile'
                className='block px-4 py-2 hover:bg-gray-100 text-gray-700'
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Mi Perfil
              </Link>

              {(user?.role === 'parking_owner') && (
                <Link
                  to='/owner'
                  className='block px-4 py-2 hover:bg-gray-100 text-gray-700'
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}

              {(user?.role === 'parking_employee') && (
                <Link
                  to='/employee'
                  className='block px-4 py-2 hover:bg-gray-100 text-gray-700'
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Mi Turno
                </Link>
              )}

              {(user?.role === 'admin') && (
                <Link
                  to='/admin'
                  className='block px-4 py-2 hover:bg-gray-100 text-gray-700'
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Panel Admin
                </Link>
              )}

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className='w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500 border-t border-gray-100'
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        className='md:hidden flex flex-col gap-1'
        onClick={() => setIsProfileOpen(!isProfileOpen)}
      >
        <span className='w-6 h-1 bg-white rounded'></span>
        <span className='w-6 h-1 bg-white rounded'></span>
        <span className='w-6 h-1 bg-white rounded'></span>
      </button>

      {/* Mobile Menu */}
      {isProfileOpen && (
        <div className='absolute top-16 left-0 w-full bg-white shadow-md flex flex-col p-4 gap-3 md:hidden z-50'>
          <div className='flex items-center gap-3 pb-2 border-b border-gray-100'>
            <img
              src={user?.avatarUrl || 'https://i.pravatar.cc/40'}
              alt='Perfil'
              className='w-10 h-10 rounded-full object-cover'
            />
            <div>
              <p className='text-sm font-medium text-gray-900'>
                {user?.email || 'Usuario'}
              </p>
              <p className='text-xs text-gray-500 capitalize'>
                {user?.role?.replace('_', ' ') || 'Sin rol'}
              </p>
            </div>
          </div>
          
          <Link
            to='/'
            className='text-gray-700 hover:text-blue-600'
            onClick={() => setIsProfileOpen(false)}
          >
            Inicio
          </Link>
          
          <Link
            to='/profile'
            className='text-gray-700 hover:text-blue-600'
            onClick={() => setIsProfileOpen(false)}
          >
            Mi Perfil
          </Link>

          {(user?.role === 'parking_owner') && (
            <Link
              to='/owner'
              className='text-gray-700 hover:text-blue-600'
              onClick={() => setIsProfileOpen(false)}
            >
              Dashboard
            </Link>
          )}

          {(user?.role === 'parking_employee') && (
            <Link
              to='/employee'
              className='text-gray-700 hover:text-blue-600'
              onClick={() => setIsProfileOpen(false)}
            >
              Mi Turno
            </Link>
          )}

          <button
            onClick={() => {
              setIsProfileOpen(false);
              handleLogout();
            }}
            className='text-left text-red-500 font-medium pt-2 border-t border-gray-100'
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;