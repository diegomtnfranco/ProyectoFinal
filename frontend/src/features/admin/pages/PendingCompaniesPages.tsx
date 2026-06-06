import { CheckCircle, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Company {
  id: number
  parkingName: string
  capacity: number
  email: string
  acceptReservations: string
  status: string
}

function PendingCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    const data = JSON.parse(
      localStorage.getItem('companies') || '[]'
    )

    setCompanies(
      data.filter(
        (company: Company) =>
          company.status === 'PENDING'
      )
    )
  }, [])

  const approveCompany = (id: number) => {
    const companiesData = JSON.parse(
      localStorage.getItem('companies') || '[]'
    )

    const updatedCompanies = companiesData.map(
      (company: Company) =>
        company.id === id
          ? {
              ...company,
              status: 'ACTIVE'
            }
          : company
    )

    localStorage.setItem(
      'companies',
      JSON.stringify(updatedCompanies)
    )

    setCompanies(
      updatedCompanies.filter(
        (company: Company) =>
          company.status === 'PENDING'
      )
    )
  }

  const rejectCompany = (id: number) => {
    const companiesData = JSON.parse(
      localStorage.getItem('companies') || '[]'
    )

    const updatedCompanies =
      companiesData.filter(
        (company: Company) =>
          company.id !== id
      )

    localStorage.setItem(
      'companies',
      JSON.stringify(updatedCompanies)
    )

    setCompanies(
      updatedCompanies.filter(
        (company: Company) =>
          company.status === 'PENDING'
      )
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Altas Pendientes
        </h1>

        <p className="text-gray-500">
          Empresas pendientes de aprobación
        </p>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No existen solicitudes pendientes
        </div>
      ) : (
        <div className="grid gap-4">
          {companies.map((company) => (
            <div
              key={company.id}
              className="
                rounded-xl
                border
                border-gray-200
                bg-white
                p-5
                shadow-sm
                hover:shadow-md
                transition-all
              "
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      {company.parkingName}
                    </h2>

                    <p className="text-sm text-gray-500">
                      {company.email}
                    </p>
                  </div>

                  <span
                    className="
                      rounded-full
                      bg-yellow-100
                      px-3
                      py-1
                      text-xs
                      font-medium
                      text-yellow-700
                    "
                  >
                    Pendiente
                  </span>
                </div>

                <div className="grid gap-2 text-sm">
                  <div>
                    <span className="font-medium">
                      Capacidad:
                    </span>{' '}
                    {company.capacity} espacios
                  </div>

                  <div>
                    <span className="font-medium">
                      Reservas:
                    </span>{' '}
                    {company.acceptReservations === 'si'
                      ? 'Sí'
                      : 'No'}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    onClick={() =>
                      approveCompany(company.id)
                    }
                    className="
                      flex
                      items-center
                      justify-center
                      gap-2
                      rounded-lg
                      bg-green-500
                      px-4
                      py-3
                      text-white
                      font-medium
                      hover:bg-green-600
                      transition-all
                    "
                  >
                    <CheckCircle size={18} />
                    Dar de Alta
                  </button>

                  <button
                    onClick={() =>
                      rejectCompany(company.id)
                    }
                    className="
                      flex
                      items-center
                      justify-center
                      gap-2
                      rounded-lg
                      bg-red-500
                      px-4
                      py-3
                      text-white
                      font-medium
                      hover:bg-red-600
                      transition-all
                    "
                  >
                    <XCircle size={18} />
                    Rechazar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PendingCompaniesPage