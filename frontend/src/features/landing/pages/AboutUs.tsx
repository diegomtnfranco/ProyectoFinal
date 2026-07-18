import {
  Building2,
  Car,
  QrCode,
  Users,
  Star,
  ShieldCheck,
  ArrowLeft,
  LogIn,
  UserPlus,
} from "lucide-react";

export default function AboutUs() {
  const users = [
    {
      icon: Car,
      title: "Conductores",
      description:
        "Encuentran estacionamientos disponibles en segundos, realizan reservas anticipadas y utilizan códigos QR para ingresar y retirar su vehículo sin demoras.",
    },
    {
      icon: Building2,
      title: "Empresas",
      description:
        "Administran espacios disponibles, empleados, clientes frecuentes, promociones, auditorías y estadísticas desde un único panel.",
    },
    {
      icon: Users,
      title: "Empleados",
      description:
        "Controlan ingresos y egresos mediante escaneo de QR, verifican reservas y mantienen actualizado el estado del estacionamiento.",
    },
  ];

  const reviews = [
    {
      name: "Parking Centro",
      review:
        "Ahora administramos más de 300 vehículos diarios sin registros en papel. El control mediante QR redujo significativamente los tiempos de ingreso.",
    },
    {
      name: "Laura Gómez",
      review:
        "Antes tardaba hasta 20 minutos buscando dónde estacionar. Hoy reservo desde el celular y entro directamente con un código QR.",
    },
    {
      name: "Garage Norte",
      review:
        "Con las estadísticas pudimos identificar horarios pico y ofrecer promociones a clientes frecuentes aumentando nuestra ocupación.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HERO */}

      <section className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white">

        <div className="max-w-7xl mx-auto px-6 py-24">

          <span className="bg-white/20 px-4 py-2 rounded-full text-sm">
            EstacionApp
          </span>

          <h1 className="text-5xl font-bold mt-8 max-w-4xl">
            Facilitamos el encuentro entre conductores y empresas de
            estacionamiento mediante una plataforma inteligente,
            segura y completamente digital.
          </h1>

          <p className="mt-8 text-xl max-w-3xl text-blue-100 leading-relaxed">
            Nuestro objetivo es simplificar la búsqueda de lugares para
            estacionar, automatizar el ingreso y egreso mediante códigos QR
            y ofrecer a las empresas herramientas modernas para administrar
            sus estacionamientos, clientes y empleados desde un único sistema.
          </p>

        </div>

      </section>

      {/* MISIÓN */}

      <section className="max-w-7xl mx-auto px-6 py-20">

        <div className="grid lg:grid-cols-2 gap-12">

          <div>

            <h2 className="text-4xl font-bold mb-6">
              Nuestra misión
            </h2>

            <p className="text-gray-600 text-lg leading-8">
              EstacionApp nace para modernizar la administración de
              estacionamientos y mejorar la experiencia de los conductores.
              Nuestra plataforma conecta usuarios que buscan un lugar libre
              con empresas que desean optimizar la utilización de sus espacios,
              automatizando reservas, pagos, ingresos y egresos mediante
              tecnología QR.
            </p>

          </div>

          <div className="bg-white rounded-3xl shadow-lg p-10">

            <ShieldCheck
              className="text-blue-600"
              size={60}
            />

            <h3 className="text-2xl font-semibold mt-6">
              ¿Qué ofrecemos?
            </h3>

            <ul className="space-y-4 mt-6 text-gray-600">

              <li>✔ Reservas anticipadas.</li>

              <li>✔ Disponibilidad en tiempo real.</li>

              <li>✔ Acceso mediante códigos QR.</li>

              <li>✔ Pagos digitales.</li>

              <li>✔ Gestión completa de estacionamientos.</li>

              <li>✔ Estadísticas y auditorías.</li>

              <li>✔ Administración de empleados.</li>

            </ul>

          </div>

        </div>

      </section>

      {/* USUARIOS */}

      <section className="bg-white py-20">

        <div className="max-w-7xl mx-auto px-6">

          <h2 className="text-4xl font-bold text-center mb-14">
            ¿Quiénes utilizan EstacionApp?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">

            {users.map((user) => {

              const Icon = user.icon;

              return (

                <div
                  key={user.title}
                  className="rounded-2xl border p-8 hover:shadow-xl transition"
                >

                  <Icon
                    size={55}
                    className="text-blue-600"
                  />

                  <h3 className="text-2xl font-semibold mt-6">
                    {user.title}
                  </h3>

                  <p className="text-gray-600 mt-4 leading-7">
                    {user.description}
                  </p>

                </div>

              );

            })}

          </div>

        </div>

      </section>

      {/* PROBLEMAS */}

      <section className="py-20">

        <div className="max-w-6xl mx-auto px-6">

          <h2 className="text-4xl font-bold mb-10">
            Problemas que resolvemos
          </h2>

          <div className="grid lg:grid-cols-2 gap-8">

            <div className="bg-white rounded-xl p-8 shadow">

              <QrCode className="text-blue-600" size={45} />

              <h3 className="text-2xl font-semibold mt-4">
                Para conductores
              </h3>

              <ul className="mt-5 space-y-3 text-gray-600">

                <li>• Evitar recorrer varias cuadras buscando lugar.</li>

                <li>• Reservar estacionamiento antes de llegar.</li>

                <li>• Acceder rápidamente mediante QR.</li>

                <li>• Pagar desde la aplicación.</li>

              </ul>

            </div>

            <div className="bg-white rounded-xl p-8 shadow">

              <Building2
                className="text-blue-600"
                size={45}
              />

              <h3 className="text-2xl font-semibold mt-4">
                Para empresas
              </h3>

              <ul className="mt-5 space-y-3 text-gray-600">

                <li>• Control de ocupación en tiempo real.</li>

                <li>• Administración de empleados.</li>

                <li>• Clientes frecuentes y descuentos.</li>

                <li>• Reportes y auditorías.</li>

                <li>• Mayor visibilidad del negocio.</li>

              </ul>

            </div>

          </div>

        </div>

      </section>

      {/* EMPRESAS */}

      <section className="bg-blue-700 text-white py-20">

        <div className="max-w-6xl mx-auto px-6">

          <h2 className="text-4xl font-bold text-center">
            Empresas que confían en EstacionApp
          </h2>

          <div className="grid md:grid-cols-4 gap-6 mt-14">

            {[
              "Parking Centro",
              "Garage Norte",
              "Smart Parking",
              "City Parking",
            ].map((company) => (

              <div
                key={company}
                className="bg-white/10 rounded-xl p-10 text-center"
              >
                <Building2 className="mx-auto mb-4" />
                {company}
              </div>

            ))}

          </div>

        </div>

      </section>

      {/* REVIEWS */}

      <section className="py-20">

        <div className="max-w-6xl mx-auto px-6">

          <h2 className="text-4xl font-bold text-center mb-14">
            Lo que dicen nuestros usuarios
          </h2>

          <div className="grid md:grid-cols-3 gap-8">

            {reviews.map((review) => (

              <div
                key={review.name}
                className="bg-white rounded-2xl shadow p-8"
              >

                <Star
                  className="text-yellow-400"
                  fill="currentColor"
                />

                <p className="text-gray-600 mt-6 leading-7">
                  "{review.review}"
                </p>

                <h4 className="font-semibold mt-6">
                  {review.name}
                </h4>

              </div>

            ))}

          </div>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="bg-slate-900 text-white py-12">

        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">

          <div>

            <h3 className="text-2xl font-bold">
              EstacionApp
            </h3>

            <p className="text-slate-400 mt-2">
              Digitalizando la gestión de estacionamientos.
            </p>

          </div>

          <div className="flex gap-4">

            <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 px-5 py-3 rounded-lg bg-slate-700 hover:bg-slate-600">
              <ArrowLeft size={18} />
              Inicio
            </button>

            <button onClick={() => window.location.href = '/login'} className="flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700">
              <LogIn size={18} />
              Iniciar sesión
            </button>

            <button onClick={() => window.location.href = '/register'} className="flex items-center gap-2 px-5 py-3 rounded-lg bg-green-600 hover:bg-green-700">
              <UserPlus size={18} />
              Registrarse
            </button>

          </div>

        </div>

      </footer>

    </main>
  );
}