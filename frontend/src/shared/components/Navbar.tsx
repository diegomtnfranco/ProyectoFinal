// // frontend/src/shared/components/navigation/Navbar.tsx
// import { useState } from 'react';
// import { Link } from 'react-router-dom';
// import { useAuthStore } from '../../stores/authStore';
// import ParkingLogo from '../../assets/logos/Parking-Logo.jpg';
// import { Calendar, User, LogOut, Home, LayoutDashboard, Briefcase, Shield } from 'lucide-react';

// function Navbar() {
//   const { user, logout } = useAuthStore();
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const [isProfileOpen, setIsProfileOpen] = useState(false);

//   const handleLogout = () => {
//     logout();
//   };

//   const getDisplayName = () => {
//     if (user?.role === 'parking_owner') {
//       return 'Mi Estacionamiento';
//     }
//     if (user?.role === 'parking_employee') {
//       return 'Mi Trabajo';
//     }
//     return 'Parking App';
//   };

//   // Obtener la ruta de inicio según el rol
//   const getHomeRoute = () => {
//     if (!user) return '/';
//     switch (user.role) {
//       case 'client':
//         return '/client';
//       case 'parking_owner':
//         return '/owner';
//       case 'parking_employee':
//         return '/employee';
//       case 'admin':
//         return '/admin';
//       default:
//         return '/';
//     }
//   };

//   // Obtener la ruta de perfil según el rol
//   const getProfileRoute = () => {
//     if (!user) return '/';
//     switch (user.role) {
//       case 'client':
//         return '/client/profile';
//       case 'parking_owner':
//         return '/owner/profile';
//       case 'parking_employee':
//         return '/employee/profile';
//       case 'admin':
//         return '/admin/profile';
//       default:
//         return '/';
//     }
//   };

//   // Enlaces principales en la barra de navegación (solo los más importantes)
//   const getNavLinks = () => {
//     const links = [];
    
//     if (user?.role === 'client') {
//       links.push({ to: '/client', label: 'Inicio', icon: <Home size={18} /> });
//       // Mis Reservas NO va aquí, solo en el dropdown
//     } else if (user?.role === 'parking_owner') {
//       links.push({ to: '/owner', label: 'Dashboard', icon: <LayoutDashboard size={18} /> });
//     } else if (user?.role === 'parking_employee') {
//       links.push({ to: '/employee', label: 'Mi Turno', icon: <Briefcase size={18} /> });
//     } else if (user?.role === 'admin') {
//       links.push({ to: '/admin', label: 'Panel Admin', icon: <Shield size={18} /> });
//     }
    
//     return links;
//   };

//   // Si no hay usuario, no renderizar el navbar
//   if (!user) {
//     return null;
//   }

//   return (
//     <nav className='bg-blue-500 shadow-md h-16 px-4 flex items-center justify-between relative'>
//       {/* Logo y nombre */}
//       <Link to={getHomeRoute()} className='flex items-center gap-2 cursor-pointer'>
//         <img
//           src={ParkingLogo}
//           alt='Parking Logo'
//           className='w-10 h-10 rounded-md'
//         />
//         <span className='text-white font-bold text-xl'>{getDisplayName()}</span>
//       </Link>

//       {/* Desktop Menu */}
//       <div className='hidden md:flex items-center gap-6'>
//         {getNavLinks().map((link) => (
//           <Link key={link.to} to={link.to} className='text-white hover:text-gray-200 flex items-center gap-1'>
//             {link.icon}
//             <span className='text-white font-medium'>{link.label}</span>
//           </Link>
//         ))}

//         {/* Profile Dropdown */}
//         <div className='relative'>
//           <button
//             onClick={() => setIsProfileOpen(!isProfileOpen)}
//             className='flex items-center justify-center focus:outline-none'
//           >
//             <img
//               src={user?.avatarUrl || 'https://i.pravatar.cc/40'}
//               alt='Perfil'
//               className='w-10 h-10 rounded-full border-2 border-white object-cover'
//             />
//           </button>

//           {isProfileOpen && (
//             <div className='absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-50'>
//               <div className='px-4 py-2 border-b border-gray-100'>
//                 <p className='text-sm font-medium text-gray-900'>
//                   {user?.email || 'Usuario'}
//                 </p>
//                 <p className='text-xs text-gray-500 capitalize'>
//                   {user?.role?.replace('_', ' ') || 'Sin rol'}
//                 </p>
//               </div>
              
//               <Link
//                 to={getProfileRoute()}
//                 className='flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-gray-700'
//                 onClick={() => setIsProfileOpen(false)}
//               >
//                 <User size={16} />
//                 Mi Perfil
//               </Link>

//               {/* Mis Reservas solo para clientes y solo aquí (una sola vez) */}
//               {user?.role === 'client' && (
//                 <Link
//                   to='/client/my-reservations'
//                   className='flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-gray-700'
//                   onClick={() => setIsProfileOpen(false)}
//                 >
//                   <Calendar size={16} />
//                   Mis Reservas
//                 </Link>
//               )}

//               <button
//                 onClick={() => {
//                   setIsProfileOpen(false);
//                   handleLogout();
//                 }}
//                 className='w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-red-500 border-t border-gray-100'
//               >
//                 <LogOut size={16} />
//                 Cerrar sesión
//               </button>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Mobile Menu Button */}
//       <button
//         className='md:hidden flex flex-col gap-1 focus:outline-none'
//         onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
//       >
//         <span className='w-6 h-1 bg-white rounded'></span>
//         <span className='w-6 h-1 bg-white rounded'></span>
//         <span className='w-6 h-1 bg-white rounded'></span>
//       </button>

//       {/* Mobile Menu */}
//       {isMobileMenuOpen && (
//         <div className='absolute top-16 left-0 w-full bg-white shadow-md flex flex-col p-4 gap-3 md:hidden z-50'>
//           <div className='flex items-center gap-3 pb-2 border-b border-gray-100'>
//             <img
//               src={user?.avatarUrl || 'https://i.pravatar.cc/40'}
//               alt='Perfil'
//               className='w-10 h-10 rounded-full object-cover'
//             />
//             <div>
//               <p className='text-sm font-medium text-gray-900'>
//                 {user?.email || 'Usuario'}
//               </p>
//               <p className='text-xs text-gray-500 capitalize'>
//                 {user?.role?.replace('_', ' ') || 'Sin rol'}
//               </p>
//             </div>
//           </div>
          
//           {getNavLinks().map((link) => (
//             <Link
//               key={link.to}
//               to={link.to}
//               className='flex items-center gap-2 text-gray-700 hover:text-blue-600'
//               onClick={() => setIsMobileMenuOpen(false)}
//             >
//               {link.icon}
//               {link.label}
//             </Link>
//           ))}
          
//           <Link
//             to={getProfileRoute()}
//             className='flex items-center gap-2 text-gray-700 hover:text-blue-600'
//             onClick={() => setIsMobileMenuOpen(false)}
//           >
//             <User size={18} />
//             Mi Perfil
//           </Link>

//           {user?.role === 'client' && (
//             <Link
//               to='/client/my-reservations'
//               className='flex items-center gap-2 text-gray-700 hover:text-blue-600'
//               onClick={() => setIsMobileMenuOpen(false)}
//             >
//               <Calendar size={18} />
//               Mis Reservas
//             </Link>
//           )}

//           <button
//             onClick={() => {
//               setIsMobileMenuOpen(false);
//               handleLogout();
//             }}
//             className='flex items-center gap-2 text-left text-red-500 font-medium pt-2 border-t border-gray-100'
//           >
//             <LogOut size={18} />
//             Cerrar sesión
//           </button>
//         </div>
//       )}
//     </nav>
//   );
// }

// export default Navbar;

// // frontend/src/shared/components/navigation/Navbar.tsx
// import { useState } from 'react';
// import { Link } from 'react-router-dom';
// import { useAuthStore } from '../../stores/authStore';
// import ParkingLogo from '../../assets/logos/Parking-Logo.jpg';
// import { Calendar, User, LogOut, Home, LayoutDashboard, Briefcase, Shield } from 'lucide-react';

// function Navbar() {
//   const { user, logout } = useAuthStore();
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const [isProfileOpen, setIsProfileOpen] = useState(false);

//   const handleLogout = () => {
//     logout();
//   };

//   const getDisplayName = () => {
//     if (user?.role === 'parking_owner') {
//       return 'Mi Estacionamiento';
//     }
//     if (user?.role === 'parking_employee') {
//       return 'Mi Trabajo';
//     }
//     return 'Parking App';
//   };

//   // Usar rutas ABSOLUTAS (siempre con / al inicio)
//   const routes = {
//     home: user?.role === 'client' ? '/client' : 
//            user?.role === 'parking_owner' ? '/owner' :
//            user?.role === 'parking_employee' ? '/employee' :
//            user?.role === 'admin' ? '/admin' : '/',
//     profile: user?.role === 'client' ? '/client/profile' : 
//              user?.role === 'parking_owner' ? '/owner/profile' :
//              user?.role === 'parking_employee' ? '/employee/profile' :
//              user?.role === 'admin' ? '/admin/profile' : '/',
//     reservations: user?.role === 'client' ? '/client/my-reservations' : null,
//   };

//   // Enlaces principales en la barra de navegación
//   const getNavLinks = () => {
//     const links = [];
    
//     if (user?.role === 'client') {
//       links.push({ to: '/client', label: 'Inicio', icon: <Home size={18} /> });
//     } else if (user?.role === 'parking_owner') {
//       links.push({ to: '/owner', label: 'Dashboard', icon: <LayoutDashboard size={18} /> });
//     } else if (user?.role === 'parking_employee') {
//       links.push({ to: '/employee', label: 'Mi Turno', icon: <Briefcase size={18} /> });
//     } else if (user?.role === 'admin') {
//       links.push({ to: '/admin', label: 'Panel Admin', icon: <Shield size={18} /> });
//     }
    
//     return links;
//   };

//   // Si no hay usuario, no renderizar el navbar
//   if (!user) {
//     return null;
//   }

// console.log('Navbar - user role:', user?.role);
// console.log('Navbar - profile route:', routes.profile);
// console.log('Navbar - home route:', routes.home);
//   return (
//     <nav className='bg-blue-500 shadow-md h-16 px-4 flex items-center justify-between relative'>
//       {/* Logo y nombre */}
//       <Link to={routes.home} className='flex items-center gap-2 cursor-pointer'>
//         <img
//           src={ParkingLogo}
//           alt='Parking Logo'
//           className='w-10 h-10 rounded-md'
//         />
//         <span className='text-white font-bold text-xl'>{getDisplayName()}</span>
//       </Link>

//       {/* Desktop Menu */}
//       <div className='hidden md:flex items-center gap-6'>
//         {getNavLinks().map((link) => (
//           <Link key={link.to} to={link.to} className='text-white hover:text-gray-200 flex items-center gap-1'>
//             {link.icon}
//             <span className='text-white font-medium'>{link.label}</span>
//           </Link>
//         ))}

//         {/* Profile Dropdown */}
//         <div className='relative'>
//           <button
//             onClick={() => setIsProfileOpen(!isProfileOpen)}
//             className='flex items-center justify-center focus:outline-none'
//           >
//             <img
//               src={user?.avatarUrl || 'https://i.pravatar.cc/40'}
//               alt='Perfil'
//               className='w-10 h-10 rounded-full border-2 border-white object-cover'
//             />
//           </button>

//           {isProfileOpen && (
//             <div className='absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-50'>
//               <div className='px-4 py-2 border-b border-gray-100'>
//                 <p className='text-sm font-medium text-gray-900'>
//                   {user?.email || 'Usuario'}
//                 </p>
//                 <p className='text-xs text-gray-500 capitalize'>
//                   {user?.role?.replace('_', ' ') || 'Sin rol'}
//                 </p>
//               </div>
              
//               <Link
//                 to={routes.profile}
//                 className='flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-gray-700'
//                 onClick={() => setIsProfileOpen(false)}
//               >
//                 <User size={16} />
//                 Mi Perfil
//               </Link>

//               {/* Mis Reservas solo para clientes */}
//               {routes.reservations && (
//                 <Link
//                   to={routes.reservations}
//                   className='flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-gray-700'
//                   onClick={() => setIsProfileOpen(false)}
//                 >
//                   <Calendar size={16} />
//                   Mis Reservas
//                 </Link>
//               )}

//               <button
//                 onClick={() => {
//                   setIsProfileOpen(false);
//                   handleLogout();
//                 }}
//                 className='w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-red-500 border-t border-gray-100'
//               >
//                 <LogOut size={16} />
//                 Cerrar sesión
//               </button>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Mobile Menu Button */}
//       <button
//         className='md:hidden flex flex-col gap-1 focus:outline-none'
//         onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
//       >
//         <span className='w-6 h-1 bg-white rounded'></span>
//         <span className='w-6 h-1 bg-white rounded'></span>
//         <span className='w-6 h-1 bg-white rounded'></span>
//       </button>

//       {/* Mobile Menu */}
//       {isMobileMenuOpen && (
//         <div className='absolute top-16 left-0 w-full bg-white shadow-md flex flex-col p-4 gap-3 md:hidden z-50'>
//           <div className='flex items-center gap-3 pb-2 border-b border-gray-100'>
//             <img
//               src={user?.avatarUrl || 'https://i.pravatar.cc/40'}
//               alt='Perfil'
//               className='w-10 h-10 rounded-full object-cover'
//             />
//             <div>
//               <p className='text-sm font-medium text-gray-900'>
//                 {user?.email || 'Usuario'}
//               </p>
//               <p className='text-xs text-gray-500 capitalize'>
//                 {user?.role?.replace('_', ' ') || 'Sin rol'}
//               </p>
//             </div>
//           </div>
          
//           {getNavLinks().map((link) => (
//             <Link
//               key={link.to}
//               to={link.to}
//               className='flex items-center gap-2 text-gray-700 hover:text-blue-600'
//               onClick={() => setIsMobileMenuOpen(false)}
//             >
//               {link.icon}
//               {link.label}
//             </Link>
//           ))}
          
//           <Link
//             to={routes.profile}
//             className='flex items-center gap-2 text-gray-700 hover:text-blue-600'
//             onClick={() => setIsMobileMenuOpen(false)}
//           >
//             <User size={18} />
//             Mi Perfil
//           </Link>

//           {routes.reservations && (
//             <Link
//               to={routes.reservations}
//               className='flex items-center gap-2 text-gray-700 hover:text-blue-600'
//               onClick={() => setIsMobileMenuOpen(false)}
//             >
//               <Calendar size={18} />
//               Mis Reservas
//             </Link>
//           )}

//           <button
//             onClick={() => {
//               setIsMobileMenuOpen(false);
//               handleLogout();
//             }}
//             className='flex items-center gap-2 text-left text-red-500 font-medium pt-2 border-t border-gray-100'
//           >
//             <LogOut size={18} />
//             Cerrar sesión
//           </button>
//         </div>
//       )}
//     </nav>
//   );
// }

// export default Navbar;

// frontend/src/shared/components/navigation/Navbar.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import ParkingLogo from '../../assets/logos/Parking-Logo.jpg';
import { Calendar, User, LogOut, Home, LayoutDashboard, Briefcase, Shield } from 'lucide-react';

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const getDisplayName = () => {
    if (user?.role === 'parking_owner') {
      return 'Mi Estacionamiento';
    }
    if (user?.role === 'parking_employee') {
      return 'Mi Trabajo';
    }
    return 'Parking App';
  };

  // Rutas absolutas
  const getHomeRoute = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'client': return '/client';
      case 'parking_owner': return '/owner';
      case 'parking_employee': return '/employee';
      case 'admin': return '/admin';
      default: return '/';
    }
  };

  const getProfileRoute = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'client': return '/client/profile';
      case 'parking_owner': return '/owner/profile';
      case 'parking_employee': return '/employee/profile';
      case 'admin': return '/admin/profile';
      default: return '/';
    }
  };

  const getReservationsRoute = () => {
    if (user?.role === 'client') {
      return '/client/my-reservations';
    }
    return null;
  };

  const getNavLinks = () => {
    const links = [];
    
    if (user?.role === 'client') {
      links.push({ to: '/client', label: 'Inicio', icon: <Home size={18} /> });
    } else if (user?.role === 'parking_owner') {
      links.push({ to: '/owner', label: 'Dashboard', icon: <LayoutDashboard size={18} /> });
    } else if (user?.role === 'parking_employee') {
      links.push({ to: '/employee', label: 'Mi Turno', icon: <Briefcase size={18} /> });
    } else if (user?.role === 'admin') {
      links.push({ to: '/admin', label: 'Panel Admin', icon: <Shield size={18} /> });
    }
    
    return links;
  };

  if (!user) {
    return null;
  }

  return (
    <nav className='bg-blue-500 shadow-md h-16 px-4 flex items-center justify-between relative'>
      {/* Logo y nombre */}
      <button
        onClick={() => navigate(getHomeRoute())}
        className='flex items-center gap-2 cursor-pointer'
      >
        <img
          src={ParkingLogo}
          alt='Parking Logo'
          className='w-10 h-10 rounded-md'
        />
        <span className='text-white font-bold text-xl'>{getDisplayName()}</span>
      </button>

      {/* Desktop Menu */}
      <div className='hidden md:flex items-center gap-6'>
        {getNavLinks().map((link) => (
          <Link key={link.to} to={link.to} className='text-white hover:text-gray-200 flex items-center gap-1'>
            {link.icon}
            <span className='text-white font-medium'>{link.label}</span>
          </Link>
        ))}

        {/* Profile Dropdown */}
        <div className='relative'>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className='flex items-center justify-center focus:outline-none'
          >
            <img
              src={user?.avatarUrl || 'https://i.pravatar.cc/40'}
              alt='Perfil'
              className='w-10 h-10 rounded-full border-2 border-white object-cover'
            />
          </button>

          {isProfileOpen && (
            <div className='absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-50'>
              <div className='px-4 py-2 border-b border-gray-100'>
                <p className='text-sm font-medium text-gray-900'>
                  {user?.email || 'Usuario'}
                </p>
                <p className='text-xs text-gray-500 capitalize'>
                  {user?.role?.replace('_', ' ') || 'Sin rol'}
                </p>
              </div>
              
              {/* Usar navigate con ruta absoluta en lugar de Link */}
              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate(getProfileRoute());
                }}
                className='w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-gray-700'
              >
                <User size={16} />
                Mi Perfil
              </button>

              {getReservationsRoute() && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate(getReservationsRoute()!);
                  }}
                  className='w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-gray-700'
                >
                  <Calendar size={16} />
                  Mis Reservas
                </button>
              )}

              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  handleLogout();
                }}
                className='w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-red-500 border-t border-gray-100'
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        className='md:hidden flex flex-col gap-1 focus:outline-none'
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <span className='w-6 h-1 bg-white rounded'></span>
        <span className='w-6 h-1 bg-white rounded'></span>
        <span className='w-6 h-1 bg-white rounded'></span>
      </button>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
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
          
          {getNavLinks().map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className='flex items-center gap-2 text-gray-700 hover:text-blue-600'
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              navigate(getProfileRoute());
            }}
            className='flex items-center gap-2 text-left text-gray-700 hover:text-blue-600'
          >
            <User size={18} />
            Mi Perfil
          </button>

          {getReservationsRoute() && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate(getReservationsRoute()!);
              }}
              className='flex items-center gap-2 text-left text-gray-700 hover:text-blue-600'
            >
              <Calendar size={18} />
              Mis Reservas
            </button>
          )}

          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleLogout();
            }}
            className='flex items-center gap-2 text-left text-red-500 font-medium pt-2 border-t border-gray-100'
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;