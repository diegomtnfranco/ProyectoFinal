// import { Link } from 'react-router-dom';
// import { Smartphone, MapPin, BarChart3, LogOut } from 'lucide-react';
// import { useAuthStore } from '../../../stores/authStore';
// import ParkingLogo2 from '../../../assets/logos/logo-app.png'

// function LandingPage() {
//   const { user,logout } = useAuthStore();
  
//   let userName =''

//   if (user?.clientProfile?.name) userName=user.clientProfile.name
// if (user?.parkingOwnerProfile?.name) userName=user.parkingOwnerProfile.name
// if (user?.employeeProfile?.name) userName=user.employeeProfile.name
// if (userName==='' && user?.email) userName=user?.email
// const handleLogout = () => {
//     logout()

//     window.location.href = '/'
//   }
// const userRole = user?.role;

//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col font-sans scroll-smooth">
      
//       {/* navbar */}
//       <nav className="bg-white shadow-md py-4 px-4 md:px-8 flex justify-between items-center sticky top-0 z-50">
       
//         <Link
//                 to="/"
//                 className="flex items-center gap-2"
//               >
//                 <img
//                   src={ParkingLogo2}
//                   alt="Parking Logo"
//                   className="w-12 h-12 rounded-md"
//                 />
        
              
//               </Link>
        
//         <div className="hidden md:flex gap-8 text-gray-600 font-medium items-center">
//           <a href="#inicio" className="hover:text-blue-600 transition-colors">Inicio</a>
//           <a href="#porque-elegirnos" className="hover:text-blue-600 transition-colors">Por qué elegirnos?</a>
//           <a href="#contacto" className="hover:text-blue-600 transition-colors">Contacto</a>
//         </div>

//         <div className="flex gap-2 md:gap-4 items-center">
//           {user ? (<div className="flex items-center gap-4">

//             <span className="text-blue-600 font-bold px-4">{'¡Hola, '+ userName.trim()+'!'} 
             
//          </span> <span onClick={handleLogout}  className=" text-red-500 px-5 py-4 flex gap-2 items-center cursor-pointer"><LogOut onClick={handleLogout} className="w-6 h-6 text-red-500"  />Cerrar sesión</span>
//           </div>
             
//           ) : (
//             <>
//               <Link 
//                 to="/login" 
//                 className="text-blue-600 font-bold hover:bg-blue-50 py-2 px-2 md:px-4 rounded-xl transition-all text-sm md:text-base"
//               >
//                 Iniciar Sesión
//               </Link>
//               <Link 
//                 to="/register" 
//                 className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 md:px-6 rounded-xl shadow-lg transition-all text-sm md:text-base"
//               >
//                 Registrarme
//               </Link>
//             </>
//           )}
//         </div>
//       </nav>

//       {/* hero */}
//      <main id="inicio" className="flex flex-col items-center justify-center text-center px-4 py-24 bg-gradient-to-b from-blue-50 to-gray-50">
//   <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 drop-shadow-sm leading-tight">
//     Tu estacionamiento, <br className="hidden md:block"/>
//     <span className="text-blue-600">a un click de distancia.</span>
//   </h1>
  
//   <p className="text-xl text-gray-600 mb-12 max-w-2xl leading-relaxed">
//     La primer plataforma para encontrar lugar al instante o administrar los ingresos de tu propia playa de vehículos
//   </p>
  
//   <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
//     {/* user exist? rol ?*/}
//     {user ? (
//       <Link 
//         to={user?.role === 'client' ? '/client' : '/owner'} 
//         className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl transition-all text-lg w-full sm:w-auto"
//       >
//         {user?.role === 'client' ? 'Ir a mi perfil' : 'Ir a mi panel'}
//       </Link>
//     ) : (
//       <>
//         <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl transition-all text-lg w-full sm:w-auto">
//           Buscar estacionamiento
//         </Link>
//         <Link to="/register" className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-4 px-8 rounded-2xl shadow-md transition-all text-lg w-full sm:w-auto">
//           Asociar mi cochera
//         </Link>
//       </>
//     )}
//   </div>
// </main>

//       {/* Secciones (mismo código) */}
//       <section id="porque-elegirnos" className="py-20 px-8 max-w-7xl mx-auto w-full">
//         <div className="text-center mb-16">
//           <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">¿Por qué elegir Estacionapp?</h2>
//           <p className="text-gray-600 text-lg">Diseñada tanto para conductores como para dueños de cocheras.</p>
//         </div>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//             <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
//                 <Smartphone className="w-16 h-16 text-blue-500 mb-6 drop-shadow-sm" strokeWidth={1.5} />
//                 <h3 className="text-xl font-bold text-gray-900 mb-3">Check-in con QR</h3>
//                 <p className="text-gray-600 leading-relaxed">Rápido, seguro y sin contacto.</p>
//             </div>
//             <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
//                 <MapPin className="w-16 h-16 text-blue-500 mb-6 drop-shadow-sm" strokeWidth={1.5} />
//                 <h3 className="text-xl font-bold text-gray-900 mb-3">Disponibilidad en tiempo real</h3>
//             </div>
//             <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
//                 <BarChart3 className="w-16 h-16 text-blue-500 mb-6 drop-shadow-sm" strokeWidth={1.5} />
//                 <h3 className="text-xl font-bold text-gray-900 mb-3">Panel de control total</h3>
//             </div>
//         </div>
//       </section>

//       <footer
//         id="contacto"
//         className="bg-gray-900 text-white mt-auto py-8 px-4 md:px-8"
//       >
//         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

//           <p className="text-sm text-gray-400">
//             © 2026 EstacionApp. Todos los derechos reservados.
//           </p>

//           <nav className="flex items-center gap-6">
//             <Link
//               to="/about-us"
//               className="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium"
//             >
//               Sobre nosotros
//             </Link>
//           </nav>

//         </div>
//       </footer>
//     </div>
//   );
// }

// export default LandingPage;
// frontend/src/features/landing/pages/LandingPage.tsx
import { Link } from 'react-router-dom';
import { 
  Smartphone, 
  MapPin, 
  BarChart3, 
  LogOut, 
  Car, 
  Clock, 
  Shield, 
  CreditCard, 
  Users, 
  QrCode, 
  TrendingUp, 
  CheckCircle,
  ArrowRight,
  Star,
  Calendar,
  Search,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import ParkingLogo2 from '../../../assets/logos/logo-app.png';
import { useState } from 'react';

function LandingPage() {
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  let userName = '';

  if (user?.clientProfile?.name) userName = user.clientProfile.name;
  if (user?.parkingOwnerProfile?.name) userName = user.parkingOwnerProfile.name;
  if (user?.employeeProfile?.name) userName = user.employeeProfile.name;
  if (userName === '' && user?.email) userName = user?.email;

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const userRole = user?.role;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans scroll-smooth">
      
      {/* ============ NAVBAR ============ */}
      <nav className="bg-white shadow-md py-3 px-4 md:px-8 flex justify-between items-center sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <img src={ParkingLogo2} alt="Parking Logo" className="w-12 h-12 rounded-md" />
          <span className="text-xl font-bold text-blue-600 hidden sm:block">EstacionApp</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8 text-gray-600 font-medium items-center">
          <a href="#inicio" className="hover:text-blue-600 transition-colors">Inicio</a>
          <a href="#beneficios" className="hover:text-blue-600 transition-colors">Beneficios</a>
          <a href="#para-que-sirve" className="hover:text-blue-600 transition-colors">Para qué sirve</a>
          <a href="#testimonios" className="hover:text-blue-600 transition-colors">Testimonios</a>
          <a href="#contacto" className="hover:text-blue-600 transition-colors">Contacto</a>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex gap-2 md:gap-4 items-center">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-blue-600 font-bold px-4">¡Hola, {userName.trim()}!</span>
              <span onClick={handleLogout} className="text-red-500 px-5 py-4 flex gap-2 items-center cursor-pointer hover:bg-red-50 rounded-xl transition-colors">
                <LogOut className="w-5 h-5 text-red-500" />
                Cerrar sesión
              </span>
            </div>
          ) : (
            <>
              <Link to="/login" className="text-blue-600 font-bold hover:bg-blue-50 py-2 px-4 rounded-xl transition-all text-sm">
                Iniciar Sesión
              </Link>
              <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all text-sm">
                Registrarme
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ============ MOBILE MENU ============ */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg py-4 px-6 flex flex-col gap-4 border-t">
          <a href="#inicio" className="hover:text-blue-600 transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Inicio</a>
          <a href="#beneficios" className="hover:text-blue-600 transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Beneficios</a>
          <a href="#para-que-sirve" className="hover:text-blue-600 transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Para qué sirve</a>
          <a href="#testimonios" className="hover:text-blue-600 transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Testimonios</a>
          <a href="#contacto" className="hover:text-blue-600 transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>Contacto</a>
          
          {user ? (
            <div className="flex flex-col gap-2 pt-2 border-t">
              <span className="text-blue-600 font-bold">¡Hola, {userName.trim()}!</span>
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="text-red-500 flex items-center gap-2 py-2">
                <LogOut className="w-5 h-5" />
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pt-2 border-t">
              <Link to="/login" className="text-blue-600 font-bold py-2 text-center hover:bg-blue-50 rounded-xl transition-all" onClick={() => setMobileMenuOpen(false)}>
                Iniciar Sesión
              </Link>
              <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 text-center rounded-xl shadow-lg transition-all" onClick={() => setMobileMenuOpen(false)}>
                Registrarme
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ============ HERO SECTION ============ */}
      <main id="inicio" className="flex flex-col items-center justify-center text-center px-4 py-16 md:py-24 bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            🚀 La revolución del estacionamiento en Tucumán
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 drop-shadow-sm leading-tight">
            Tu estacionamiento, <br className="hidden md:block"/>
            <span className="text-blue-600">a un click de distancia.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            La primera plataforma digital que conecta conductores con espacios de estacionamiento disponibles en tiempo real. 
            Encontrá, reservá y gestioná tu lugar al instante, o administrá los ingresos de tu propia playa de vehículos.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link 
                to={user?.role === 'client' ? '/client' : user?.role === 'parking_owner' ? '/owner' : '/employee'} 
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl transition-all text-lg w-full sm:w-auto flex items-center justify-center gap-2"
              >
                {user?.role === 'client' ? 'Ir a mi perfil' : user?.role === 'parking_owner' ? 'Ir a mi panel' : 'Ir a mi dashboard'}
                <ArrowRight size={20} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl transition-all text-lg w-full sm:w-auto flex items-center justify-center gap-2">
                  Buscar estacionamiento
                  <Search size={20} />
                </Link>
                <Link to="/create-company" className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-4 px-8 rounded-2xl shadow-md transition-all text-lg w-full sm:w-auto flex items-center justify-center gap-2">
                  Asociar mi cochera
                  <ArrowRight size={20} />
                </Link>
              </>
            )}
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-3xl font-bold text-blue-600">20+</p>
              <p className="text-sm text-gray-500">Estacionamientos</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-3xl font-bold text-blue-600">400+</p>
              <p className="text-sm text-gray-500">Espacios disponibles</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-3xl font-bold text-blue-600">100%</p>
              <p className="text-sm text-gray-500">En tiempo real</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-3xl font-bold text-blue-600">24/7</p>
              <p className="text-sm text-gray-500">Disponibilidad</p>
            </div>
          </div>
        </div>
      </main>

      {/* ============ BENEFICIOS SECTION ============ */}
      <section id="beneficios" className="py-16 md:py-20 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">¿Por qué elegir EstacionApp?</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Una solución completa que transforma la experiencia de estacionar y gestionar cocheras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Beneficio 1 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300 border border-gray-50">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <Smartphone className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Check-in con QR</h3>
            <p className="text-gray-600 leading-relaxed text-sm">
              Entrá y salí sin contacto. Escaneá el código QR en la entrada y salida, y el sistema registra tu estadía automáticamente. Rápido, seguro y eficiente.
            </p>
          </div>

          {/* Beneficio 2 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300 border border-gray-50">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <MapPin className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Disponibilidad en tiempo real</h3>
            <p className="text-gray-600 leading-relaxed text-sm">
              Sabé exactamente cuántos lugares hay disponibles antes de llegar. El mapa interactivo te muestra los estacionamientos cercanos con su disponibilidad actualizada al instante.
            </p>
          </div>

          {/* Beneficio 3 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300 border border-gray-50">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <BarChart3 className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Panel de control total</h3>
            <p className="text-gray-600 leading-relaxed text-sm">
              Para dueños de estacionamientos: estadísticas en tiempo real, gestión de espacios, tarifas, empleados y reservas. Todo desde un solo lugar.
            </p>
          </div>

          {/* Beneficio 4 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300 border border-gray-50">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <Clock className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Reservas anticipadas</h3>
            <p className="text-gray-600 leading-relaxed text-sm">
              Asegurá tu lugar con anticipación. Reservá desde la app y llegá con la tranquilidad de saber que tu espacio te espera.
            </p>
          </div>

          {/* Beneficio 5 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300 border border-gray-50">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <QrCode className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Códigos QR personalizados</h3>
            <p className="text-gray-600 leading-relaxed text-sm">
              Cada estacionamiento genera sus propios códigos QR para check-in y check-out. Personalizables y fáciles de instalar en la entrada y salida.
            </p>
          </div>

          {/* Beneficio 6 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300 border border-gray-50">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <Shield className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Seguridad y confianza</h3>
            <p className="text-gray-600 leading-relaxed text-sm">
              Autenticación segura con JWT, verificación de email y roles de usuario. Solo las personas autorizadas acceden a la información.
            </p>
          </div>
        </div>
      </section>

      {/* ============ PARA QUÉ SIRVE SECTION ============ */}
      <section id="para-que-sirve" className="py-16 md:py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">¿Para qué sirve EstacionApp?</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Dos experiencias, una misma plataforma. EstacionApp está diseñada para conductores y dueños de estacionamientos.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Para conductores */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 border border-blue-100">
              <div className="flex items-center gap-3 mb-6">
                <Car className="w-8 h-8 text-blue-600" />
                <h3 className="text-2xl font-bold text-gray-900">Para Conductores</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Encontrá estacionamientos cerca de tu ubicación con el mapa interactivo.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Reservá tu espacio con anticipación y evitá vueltas innecesarias.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Entrá y salí con códigos QR, sin necesidad de hablar con nadie.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Recibí notificaciones en tiempo real sobre tu reserva y estadía.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Gestioná todas tus reservas desde un solo lugar.</span>
                </li>
              </ul>
            </div>

            {/* Para dueños */}
            <div className="bg-gradient-to-br from-green-50 to-white rounded-3xl p-8 border border-green-100">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <h3 className="text-2xl font-bold text-gray-900">Para Dueños de Estacionamientos</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Dashboard con estadísticas en tiempo real de ocupación y facturación.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Gestioná espacios, tarifas y empleados desde un panel intuitivo.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Generá códigos QR personalizados para check-in y check-out.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Confirmá o cancelá reservas y gestioná ocupaciones activas.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Aumentá la eficiencia operativa con check-in/out sin contacto.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIOS SECTION ============ */}
      <section id="testimonios" className="py-16 md:py-20 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Lo que dicen nuestros usuarios</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Experiencias reales de conductores y dueños que ya confían en EstacionApp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Testimonio 1 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-1 text-yellow-400 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              "Nunca fue tan fácil encontrar estacionamiento en el centro. La app me muestra disponibilidad en tiempo real y puedo reservar antes de llegar. ¡Excelente!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">JM</div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Juan Martínez</p>
                <p className="text-xs text-gray-500">Conductor frecuente</p>
              </div>
            </div>
          </div>

          {/* Testimonio 2 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-1 text-yellow-400 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              "Administrar mi estacionamiento era un caos. Con EstacionApp tengo todo organizado: espacios, tarifas, empleados y reservas. Aumenté mis ingresos un 30%."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">CR</div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Carlos Rodríguez</p>
                <p className="text-xs text-gray-500">Dueño de estacionamiento</p>
              </div>
            </div>
          </div>

          {/* Testimonio 3 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-1 text-yellow-400 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              "El sistema de QR es genial. Llego, escaneo y ya estoy dentro. Mis empleados también lo usan y el proceso de check-in/out es súper rápido."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">MG</div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">María Gómez</p>
                <p className="text-xs text-gray-500">Empleada de estacionamiento</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA SECTION ============ */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">¿Listo para comenzar?</h2>
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Unite a la comunidad que ya está transformando la forma de estacionar y gestionar cocheras en Tucumán.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-2xl shadow-xl transition-all text-lg">
              Buscar estacionamiento
            </Link>
            <Link to="/create-company" className="bg-transparent border-2 border-white hover:bg-white/10 text-white font-bold py-4 px-8 rounded-2xl shadow-xl transition-all text-lg">
              Registrar mi cochera
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer id="contacto" className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Columna 1: Logo */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src={ParkingLogo2} alt="Parking Logo" className="w-10 h-10 rounded-md" />
              <span className="text-xl font-bold text-blue-400">EstacionApp</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              La primera plataforma digital para encontrar y gestionar estacionamientos en tiempo real.
            </p>
          </div>

          {/* Columna 2: Enlaces rápidos */}
          <div>
            <h4 className="font-bold text-white mb-4">Enlaces rápidos</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#inicio" className="text-gray-400 hover:text-blue-400 transition-colors">Inicio</a></li>
              <li><a href="#beneficios" className="text-gray-400 hover:text-blue-400 transition-colors">Beneficios</a></li>
              <li><a href="#para-que-sirve" className="text-gray-400 hover:text-blue-400 transition-colors">Para qué sirve</a></li>
              <li><Link to="/about-us" className="text-gray-400 hover:text-blue-400 transition-colors">Sobre nosotros</Link></li>
            </ul>
          </div>

          {/* Columna 3: Contacto */}
          <div>
            <h4 className="font-bold text-white mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>📧 parkingappservicestpf@gmail.com</li>
              <li>📍 San Miguel de Tucumán, Argentina</li>
            </ul>
          </div>

          {/* Columna 4: Horarios */}
          <div>
            <h4 className="font-bold text-white mb-4">Horarios de atención</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>🕐 Lunes a Viernes: 8:00 - 20:00</li>
              <li>🕐 Sábados: 9:00 - 18:00</li>
              <li>🕐 Domingos: Cerrado</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © 2026 EstacionApp. Todos los derechos reservados.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link to="/terms" className="hover:text-gray-300 transition-colors">Términos y condiciones</Link>
            <Link to="/privacy" className="hover:text-gray-300 transition-colors">Política de privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;