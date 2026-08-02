import { useState, useEffect, useRef } from 'react'
import {
  Link,
  useLocation
} from 'react-router-dom'
import ParkingLogo from '../../assets/logos/logo-eapp5.webp'
import { ownerMenu } from '../components/OwnerMenu'
import { adminMenu } from '../components/AdminMenu'
import { employeeMenu } from '../components/EmployeeMenu'
import { useAuthStore } from '../../stores/authStore'
import { clientMenu } from '../components/ClientMenu'
import {
  User,
  LogOut
} from "lucide-react";
// importo los roles de usuario



function Navbar() {
  const { user } = useAuthStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false)

  const [isProfileOpen, setIsProfileOpen] =
    useState(false)

  const location = useLocation()

  const logout = useAuthStore(
    (state) => state.logout
  )

  const menuItems =

    location.pathname.startsWith('/admin')
      ? adminMenu
      : location.pathname.startsWith('/owner')
        ? ownerMenu
        : location.pathname.startsWith('/client')
          ? clientMenu
          : location.pathname.startsWith('/employee')
            ? employeeMenu
            : []


  const profilePath =
    location.pathname.startsWith('/admin')
      ? '/admin/profile'
      : location.pathname.startsWith('/owner')
        ? '/owner/profile'
        : location.pathname.startsWith('/employee')
          ? '/employee/profile'
          : '/client/profile'

  const handleLogout = () => {
    logout()   
  }

  const showDesktopMenuClient =
    location.pathname.startsWith('/client');

  // Ref para detectar clics fuera del menú
  const menuRef = useRef<HTMLElement>(null)

  // Cerrar el menú al hacer clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false)
        setIsProfileOpen(false)
      }
    }   

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
      document.removeEventListener(
        'touchstart',
        handleClickOutside
      )
    }
  }, [])

  return (
    <nav ref={menuRef} className="bg-blue-500 shadow-md h-16 px-4 flex items-center justify-between relative"   >
      <Link
        to="/"
        className="flex items-center gap-2"
      >
        <img
          src={ParkingLogo}
          alt="Parking Logo"
          className="w-12 h-12 rounded-md "
        />

      
      </Link>

      {/* Desktop */}
      <div className="hidden md:flex items-center gap-6">

        {showDesktopMenuClient &&
          menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="text-white font-medium"
            >
              {item.name}
            </Link>
          ))
        }

        <div className="relative">
          <button
            onClick={() =>
              setIsMobileMenuOpen(
                !isMobileMenuOpen
              )
            }
          >
            <img
              src={user?.avatarUrl ? user.avatarUrl : "https://i.pravatar.cc/40"}
              alt="Perfil"
              className="w-10 h-10 rounded-full border-2 border-white"
            />
          </button>

          {isMobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-50">
              <Link
                to={profilePath}
                className="flex items-center gap-3 px-5 py-4 border-b hover:bg-gray-50"
                onClick={() => setIsProfileOpen(false)}
              >
                  <User
                    size={20}
                    className="text-gray-600 flex-shrink-0"
                  />

                  <span>Perfil</span>
                </Link>

             <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-5 py-4 text-red-500 hover:bg-red-50"
              >
                <LogOut
                  size={20}
                  className="flex-shrink-0"
                />

              <span>Cerrar sesión</span>
            </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Botón hamburguesa */}
      <button
        className="md:hidden flex flex-col gap-1"
        onClick={() =>
          setIsProfileOpen(!isProfileOpen)
        }
      >
        <span className="w-7 h-1 bg-white rounded"></span>
        <span className="w-7 h-1 bg-white rounded"></span>
        <span className="w-7 h-1 bg-white rounded"></span>
      </button>

      {/* Menú Mobile */}
      {isProfileOpen && (
        <div className="absolute top-16 left-0 w-full bg-white shadow-lg z-50 flex flex-col md:hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-5 py-4 border-b hover:bg-gray-50"
                onClick={() => setIsProfileOpen(false)}
              >
                <Icon
                  size={20}
                  className="text-gray-600 flex-shrink-0"
                />

                <span>{item.name}</span>
              </Link>
            );
          })}
          <Link
            to={profilePath}
            className="flex items-center gap-3 px-5 py-4 border-b hover:bg-gray-50"
            onClick={() => setIsProfileOpen(false)}
          >
            <User
              size={20}
              className="text-gray-600 flex-shrink-0"
            />

            <span>Perfil</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-5 py-4 text-red-500 hover:bg-red-50"
          >
            <LogOut
              size={20}
              className="flex-shrink-0"
            />

            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </nav>
  )
}

export default Navbar