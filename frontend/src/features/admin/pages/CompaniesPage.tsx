import {
  Eye,
  Pencil,
  Power
} from 'lucide-react'

const companies = [
  {
    id: 1,
    name: 'Parking Centro',
    spaces: 120,
    reservations: true,
    status: 'Activa'
  },
  {
    id: 2,
    name: 'Parking Norte',
    spaces: 80,
    reservations: false,
    status: 'Inactiva'
  },
  {
    id: 3,
    name: 'Parking Sur',
    spaces: 60,
    reservations: true,
    status: 'Activa'
  }
]

function CompaniesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Estacionamientos
          </h1>

          <p className="text-gray-500">
            Administración de empresas y parkings
          </p>
        </div>

        <button className="rounded-lg bg-blue-500 px-5 py-3 text-white font-medium hover:bg-blue-600 transition-all">
          Nueva empresa
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="px-6 py-4">Empresa</th>
              <th className="px-6 py-4">Capacidad</th>
              <th className="px-6 py-4">Reservas</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {companies.map((company) => (
              <tr
                key={company.id}
                className="border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-6 py-4 font-medium text-gray-800">
                  {company.name}
                </td>

                <td className="px-6 py-4">
                  {company.spaces} espacios
                </td>

                <td className="px-6 py-4">
                  {company.reservations ? (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                      Sí
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                      No
                    </span>
                  )}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${
                      company.status === 'Activa'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {company.status}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-3">
                    <button className="rounded-lg bg-gray-100 p-2 hover:bg-gray-200">
                      <Eye size={18} />
                    </button>

                    <button className="rounded-lg bg-blue-100 p-2 text-blue-600 hover:bg-blue-200">
                      <Pencil size={18} />
                    </button>

                    <button className="rounded-lg bg-red-100 p-2 text-red-600 hover:bg-red-200">
                      <Power size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CompaniesPage