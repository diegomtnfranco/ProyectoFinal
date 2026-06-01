import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function CreateCompanyForm() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [parkingName, setParkingName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [acceptReservations, setAcceptReservations] = useState('')

  const [error, setError] = useState('')

  // Validación de contraseñas
  const passwordsMatch =
    password === repeatPassword || repeatPassword === ''

  // Validación completa del formulario
  const isFormValid =
    fullName.trim() !== '' &&
    email.trim() !== '' &&
    password.trim() !== '' &&
    repeatPassword.trim() !== '' &&
    parkingName.trim() !== '' &&
    capacity.trim() !== '' &&
    acceptReservations.trim() !== '' &&
    password === repeatPassword

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid) {
      setError('Completá todos los campos correctamente')
      return
    }

    // Guardar temporalmente los datos
    const companyData = {
      fullName,
      email,
      password,
      parkingName,
      capacity,
      acceptReservations: acceptReservations === 'si',
    }

    localStorage.setItem(
      'companyData',
      JSON.stringify(companyData)
    )

    navigate('/company-location')
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100 p-4'>
      <form
        onSubmit={handleNext}
        className='bg-white shadow-xl rounded-3xl p-8 w-full max-w-lg flex flex-col gap-5'
      >
        <div>
          <h1 className='text-3xl font-bold'>
            Crear Empresa
          </h1>

          <p className='text-gray-500'>
            Registrá tu estacionamiento
          </p>
        </div>

        {/* Nombre */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>
            Nombre completo
          </label>

          <input
            type='text'
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder='Juan Pérez'
            required
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {/* Email */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>Email</label>

          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='empresa@mail.com'
            required
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {/* Contraseña */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>
            Contraseña
          </label>

          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder='********'
            required
            minLength={6}
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {/* Repetir contraseña */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>
            Repetir contraseña
          </label>

          <input
            type='password'
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            placeholder='********'
            required
            minLength={6}
            className={`border rounded-xl px-4 py-3 outline-none focus:ring-2 ${
              passwordsMatch
                ? 'border-gray-300 focus:ring-blue-500'
                : 'border-red-500 focus:ring-red-500'
            }`}
          />

          {!passwordsMatch && (
            <p className='text-red-500 text-sm'>
              Las contraseñas no coinciden
            </p>
          )}
        </div>

        {/* Nombre estacionamiento */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>
            Nombre del estacionamiento
          </label>

          <input
            type='text'
            value={parkingName}
            onChange={(e) => setParkingName(e.target.value)}
            placeholder='Parking Centro'
            required
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {/* Capacidad */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>
            Capacidad total de vehículos
          </label>

          <input
            type='number'
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder='100'
            required
            min={1}
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {/* Reservas */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>
            ¿Aceptarán reservas?
          </label>

          <select
            value={acceptReservations}
            onChange={(e) =>
              setAcceptReservations(e.target.value)
            }
            required
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value=''>
              Seleccionar opción
            </option>

            <option value='si'>Sí</option>

            <option value='no'>No</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className='bg-red-100 text-red-600 p-3 rounded-xl'>
            {error}
          </div>
        )}

        {/* Botón siguiente */}
        <button
          type='submit'
          disabled={!isFormValid}
          className={`text-white font-semibold py-3 rounded-xl transition-all ${
            isFormValid
              ? 'bg-blue-500 hover:bg-blue-600'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Siguiente
        </button>

        {/* Volver */}
        <button
          type='button'
          onClick={() => navigate('/register')}
          className='text-gray-500 hover:text-gray-700'
        >
          Volver
        </button>
      </form>
    </div>
  )
}

export default CreateCompanyForm