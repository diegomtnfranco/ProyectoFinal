import { Link } from 'react-router-dom';
import { Smartphone, MapPin, BarChart3, LogOut } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import ParkingLogo2 from '../../../assets/logos/logo-app.png'

function LandingPage() {
  const { user,logout } = useAuthStore();
  
  let userName =''

  if (user?.clientProfile?.name) userName=user.clientProfile.name
if (user?.parkingOwnerProfile?.name) userName=user.parkingOwnerProfile.name
if (user?.employeeProfile?.name) userName=user.employeeProfile.name
if (userName==='' && user?.email) userName=user?.email
const handleLogout = () => {
    logout()

    window.location.href = '/'
  }
const userRole = user?.role;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans scroll-smooth">
      
      {/* navbar */}
      <nav className="bg-white shadow-md py-4 px-4 md:px-8 flex justify-between items-center sticky top-0 z-50">
       
        <Link
                to="/"
                className="flex items-center gap-2"
              >
                <img
                  src={ParkingLogo2}
                  alt="Parking Logo"
                  className="w-12 h-12 rounded-md"
                />
        
              
              </Link>
        
        <div className="hidden md:flex gap-8 text-gray-600 font-medium items-center">
          <a href="#inicio" className="hover:text-blue-600 transition-colors">Inicio</a>
          <a href="#porque-elegirnos" className="hover:text-blue-600 transition-colors">Por qué elegirnos?</a>
          <a href="#contacto" className="hover:text-blue-600 transition-colors">Contacto</a>
        </div>

        <div className="flex gap-2 md:gap-4 items-center">
          {user ? (<div className="flex items-center gap-4">

            <span className="text-blue-600 font-bold px-4">{'¡Hola, '+ userName.trim()+'!'} 
             
         </span> <span onClick={handleLogout}  className=" text-red-500 px-5 py-4 flex gap-2 items-center cursor-pointer"><LogOut onClick={handleLogout} className="w-6 h-6 text-red-500"  />Cerrar sesión</span>
          </div>
             
          ) : (
            <>
              <Link 
                to="/login" 
                className="text-blue-600 font-bold hover:bg-blue-50 py-2 px-2 md:px-4 rounded-xl transition-all text-sm md:text-base"
              >
                Iniciar Sesión
              </Link>
              <Link 
                to="/register" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 md:px-6 rounded-xl shadow-lg transition-all text-sm md:text-base"
              >
                Registrarme
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* hero */}
     <main id="inicio" className="flex flex-col items-center justify-center text-center px-4 py-24 bg-gradient-to-b from-blue-50 to-gray-50">
  <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 drop-shadow-sm leading-tight">
    Tu estacionamiento, <br className="hidden md:block"/>
    <span className="text-blue-600">a un click de distancia.</span>
  </h1>
  
  <p className="text-xl text-gray-600 mb-12 max-w-2xl leading-relaxed">
    La primer plataforma para encontrar lugar al instante o administrar los ingresos de tu propia playa de vehículos
  </p>
  
  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
    {/* user exist? rol ?*/}
    {user ? (
      <Link 
        to={user?.role === 'client' ? '/client' : '/owner'} 
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl transition-all text-lg w-full sm:w-auto"
      >
        {user?.role === 'client' ? 'Ir a mi perfil' : 'Ir a mi panel'}
      </Link>
    ) : (
      <>
        <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl transition-all text-lg w-full sm:w-auto">
          Buscar estacionamiento
        </Link>
        <Link to="/register" className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-4 px-8 rounded-2xl shadow-md transition-all text-lg w-full sm:w-auto">
          Asociar mi cochera
        </Link>
      </>
    )}
  </div>
</main>

      {/* Secciones (mismo código) */}
      <section id="porque-elegirnos" className="py-20 px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">¿Por qué elegir Estacionapp?</h2>
          <p className="text-gray-600 text-lg">Diseñada tanto para conductores como para dueños de cocheras.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
                <Smartphone className="w-16 h-16 text-blue-500 mb-6 drop-shadow-sm" strokeWidth={1.5} />
                <h3 className="text-xl font-bold text-gray-900 mb-3">Check-in con QR</h3>
                <p className="text-gray-600 leading-relaxed">Rápido, seguro y sin contacto.</p>
            </div>
            <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
                <MapPin className="w-16 h-16 text-blue-500 mb-6 drop-shadow-sm" strokeWidth={1.5} />
                <h3 className="text-xl font-bold text-gray-900 mb-3">Disponibilidad en tiempo real</h3>
            </div>
            <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
                <BarChart3 className="w-16 h-16 text-blue-500 mb-6 drop-shadow-sm" strokeWidth={1.5} />
                <h3 className="text-xl font-bold text-gray-900 mb-3">Panel de control total</h3>
            </div>
        </div>
      </section>

      <footer
        id="contacto"
        className="bg-gray-900 text-white mt-auto py-8 px-4 md:px-8"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

          <p className="text-sm text-gray-400">
            © 2026 EstacionApp. Todos los derechos reservados.
          </p>

          <nav className="flex items-center gap-6">
            <Link
              to="/about-us"
              className="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium"
            >
              Sobre nosotros
            </Link>
          </nav>

        </div>
      </footer>
    </div>
  );
}

export default LandingPage;