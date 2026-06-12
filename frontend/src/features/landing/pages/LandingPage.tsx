import { Link } from 'react-router-dom';
import { Smartphone, MapPin, BarChart3 } from 'lucide-react';

function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans scroll-smooth">
      
      {/* navbar */}
      <nav className="bg-white shadow-md py-4 px-8 flex justify-between items-center sticky top-0 z-50">
        <div className="text-3xl font-extrabold text-blue-600 tracking-tight">
          Estacionapp
        </div>
        
        <div className="hidden md:flex gap-8 text-gray-600 font-medium items-center">
          <a href="#inicio" className="hover:text-blue-600 transition-colors">Inicio</a>
          <a href="#como-funciona" className="hover:text-blue-600 transition-colors">Por qué elegirnos?</a>
          <a href="#contacto" className="hover:text-blue-600 transition-colors">Contacto</a>
        </div>

        <div className="flex gap-4 items-center">
          <Link 
            to="/login" 
            className="text-blue-600 font-bold hover:bg-blue-50 py-2 px-4 rounded-xl transition-all"
          >
            Iniciar Sesión
          </Link>
          <Link 
            to="/register" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
          >
            Registrarme
          </Link>
        </div>
      </nav>

      {/* hero */}
      <main id="inicio" className="flex flex-col items-center justify-center text-center px-4 py-24 bg-gradient-to-b from-blue-50 to-gray-50">
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 drop-shadow-sm">
          Tu estacionamiento, <br className="hidden md:block"/>
          <span className="text-blue-600">a un clic de distancia.</span>
        </h1>
        
        <p className="text-xl text-gray-600 mb-12 max-w-2xl leading-relaxed">
          La primer plataforma para encontrar lugar al instante o administrar los ingresos de tu propia playa de vehículos
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            to="/login" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl transition-all text-lg w-full sm:w-auto"
          >
            Buscar Estacionamiento
          </Link>
          
          <Link 
            to="/register" 
            className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-4 px-8 rounded-2xl shadow-md transition-all text-lg w-full sm:w-auto"
          >
            Asociar mi cochera
          </Link>
        </div>
      </main>

      {/* benf  */}
      <section id="como-funciona" className="py-20 px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">¿Por qué elegir Estacionapp?</h2>
          <p className="text-gray-600 text-lg">Diseñada tanto para conductores como para dueños de cocheras.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* benf 1 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
            <Smartphone className="w-16 h-16 text-blue-500 mb-6 drop-shadow-sm" strokeWidth={1.5} />
            <h3 className="text-xl font-bold text-gray-900 mb-3">Check-in con QR</h3>
            <p className="text-gray-600 leading-relaxed">Rápido, seguro y sin contacto. Entrá y salí de la cochera escaneando tu código al instante.</p>
          </div>

          {/* benf 2 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
            <MapPin className="w-16 h-16 text-blue-500 mb-6 drop-shadow-sm" strokeWidth={1.5} />
            <h3 className="text-xl font-bold text-gray-900 mb-3">Disponibilidad en tiempo real</h3>
            <p className="text-gray-600 leading-relaxed">Olvidate de dar vueltas. Sabé exactamente cuántos lugares quedan disponibles antes de salir de tu casa.</p>
          </div>

          {/* benf 3 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300">
            <BarChart3 className="w-16 h-16 text-blue-500 mb-6 drop-shadow-sm" strokeWidth={1.5} />
            <h3 className="text-xl font-bold text-gray-900 mb-3">Panel de control total</h3>
            <p className="text-gray-600 leading-relaxed">Si sos dueño, accedé a un resumen completo de tus ventas, gestioná tus tarifas y controlá tus ingresos desde cualquier lugar.</p>
          </div>
        </div>
      </section>

      {/* footer*/}
      <footer id="contacto" className="bg-gray-900 text-white mt-auto py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-2xl font-extrabold text-blue-500 tracking-tight mb-2">Estacionapp</span>
            <span className="text-gray-400 text-sm">© 2026 Estacionapp. Todos los derechos reservados.</span>
          </div>
          
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a>
            <a href="#" className="hover:text-white transition-colors">Políticas de Privacidad</a>
            <a href="mailto:soporte@estacionapp.com" className="hover:text-white transition-colors">soporte@estacionapp.com</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;