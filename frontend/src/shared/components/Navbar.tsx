import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ParkingLogo from '../../assets/logos/logo-eapp5.webp';
import { ownerMenu } from '../components/OwnerMenu';
import { adminMenu } from '../components/AdminMenu';
import { employeeMenu } from '../components/EmployeeMenu';
import { useAuthStore } from '../../stores/authStore';
import { clientMenu } from '../components/ClientMenu';
import {
  User,
  LogOut,
  MapPin,
  Map as MapIcon,
  History,
} from 'lucide-react';

function Navbar() {
  const { user } = useAuthStore();
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();

  // Estado de navegación para distinguir la lista del mapa
  const navigationState = location.state as { showMap?: boolean } | null;

  const isMapView = location.pathname === '/client/map';
const isParkingListView = location.pathname === '/client';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const menuRef = useRef<HTMLElement>(null);

  const isClient = location.pathname.startsWith('/client');

  const menuItems = location.pathname.startsWith('/admin')
    ? adminMenu
    : location.pathname.startsWith('/owner')
      ? ownerMenu
      : isClient
        ? clientMenu
        : location.pathname.startsWith('/employee')
          ? employeeMenu
          : [];

  const profilePath = location.pathname.startsWith('/admin')
    ? '/admin/profile'
    : location.pathname.startsWith('/owner')
      ? '/owner/profile'
      : location.pathname.startsWith('/employee')
        ? '/employee/profile'
        : '/client/profile';

  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <>
      <nav
        ref={menuRef}
        className="bg-blue-500 shadow-md h-16 px-4 flex items-center justify-between relative z-40"
      >
        <Link to="/" className="flex items-center gap-2">
          <img
            src={ParkingLogo}
            alt="Parking Logo"
            className="w-12 h-12 rounded-md"
          />
        </Link>

        {/* Menú de escritorio */}
        <div className="hidden md:flex items-center gap-6">
          {isClient &&
            menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-white font-medium"
              >
                {item.name}
              </Link>
            ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Abrir menú de perfil"
            >
              <img
                src={
                  user?.avatarUrl
                    ? user.avatarUrl
                    : 'https://i.pinimg.com/474x/3c/13/98/3c139858ade16fe6bf2b3c8f7f2cd0fd.jpg?nii=t'
                    // : 'https://i.pravatar.cc/40'
                }
                alt="Perfil"
                className="w-10 h-10 rounded-full border-2 border-white"
              />
            </button>

            {isMobileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-50">
                <Link
                  to={profilePath}
                  className="flex items-center gap-3 px-5 py-4 border-b hover:bg-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User size={20} className="text-gray-600" />
                  <span>Perfil</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-5 py-4 text-red-500 hover:bg-red-50"
                >
                  <LogOut size={20} />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Menú móvil para los demás roles */}
        {!isClient && (
          <button
            type="button"
            className="md:hidden flex flex-col gap-1"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-label="Abrir menú"
            aria-expanded={isProfileOpen}
          >
            <span className="w-7 h-1 bg-white rounded" />
            <span className="w-7 h-1 bg-white rounded" />
            <span className="w-7 h-1 bg-white rounded" />
          </button>
        )}

        {!isClient && isProfileOpen && (
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
                  <Icon size={20} className="text-gray-600" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <Link
              to={profilePath}
              className="flex items-center gap-3 px-5 py-4 border-b hover:bg-gray-50"
              onClick={() => setIsProfileOpen(false)}
            >
              <User size={20} className="text-gray-600" />
              <span>Perfil</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 px-5 py-4 text-red-500 hover:bg-red-50"
            >
              <LogOut size={20} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </nav>

      {/* Barra inferior exclusiva para clientes en móviles */}
      {isClient && (
        <nav
          aria-label="Navegación del cliente"
          className="md:hidden fixed bottom-0 inset-x-0 z-[1000] bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
        >
          <div className="grid grid-cols-4 min-h-16">
            {/* Estacionamientos */}
            <Link
              to="/client"
              state={{ showMap: false }}
              className={`flex flex-col items-center justify-center gap-1 py-2 text-xs ${
                isParkingListView
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-500'
              }`}
            >
              <MapPin size={22} />
              <span>Estacionamientos</span>
            </Link>

            {/* Mapa */}
            <Link
              to="/client/map"
             
              className={`flex flex-col items-center justify-center gap-1 py-2 text-xs ${
                isMapView
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-500'
              }`}
            >
              <MapIcon size={22} />
              <span>Mapa</span>
            </Link>

            {/* Historial */}
            <Link
              to="/client/my-reservations"
              className={`flex flex-col items-center justify-center gap-1 py-2 text-xs ${
                location.pathname.startsWith('/client/my-reservations')
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-500'
              }`}
            >
              <History size={22} />
              <span>Historial</span>
            </Link>

            {/* Perfil */}
            <Link
              to="/client/profile"
              className={`flex flex-col items-center justify-center gap-1 py-2 text-xs ${
                location.pathname.startsWith('/client/profile')
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-500'
              }`}
            >
              <User size={22} />
              <span>Perfil</span>
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}

export default Navbar;