import { useState } from 'react'

function EmployeesPage() {

  const [employees, setEmployees] = useState([
    {
      id: 1,
      name: 'Juan Pérez',
      email: 'juan@parking.com'
    },
    {
      id: 2,
      name: 'María Gómez',
      email: 'maria@parking.com'
    }
  ])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleCreateEmployee = () => {

    if (!name || !email || !password) {
      alert('Completá todos los campos')
      return
    }

    const newEmployee = {
      id: Date.now(),
      name,
      email
    }

    setEmployees([...employees, newEmployee])

    setName('')
    setEmail('')
    setPassword('')

    alert('Empleado registrado correctamente')
  }

  return (
    <div className='flex flex-col gap-6'>

      <div>
        <h1 className='text-3xl font-bold'>
          Gestión de Empleados
        </h1>

        <p className='text-gray-500'>
          Administrá el personal de tu estacionamiento.
        </p>
      </div>

      <div className='bg-white rounded-2xl shadow-sm p-6'>

        <h2 className='text-xl font-semibold mb-4'>
          Registrar nuevo empleado
        </h2>

        <div className='grid md:grid-cols-3 gap-4'>

          <input
            type='text'
            placeholder='Nombre completo'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='border rounded-xl p-3'
          />

          <input
            type='email'
            placeholder='Correo electrónico'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='border rounded-xl p-3'
          />

          <input
            type='password'
            placeholder='Contraseña temporal'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className='border rounded-xl p-3'
          />

        </div>

        <button
          onClick={handleCreateEmployee}
          className='mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl'
        >
          Registrar empleado
        </button>

      </div>

      <div className='bg-white rounded-2xl shadow-sm p-6'>

        <h2 className='text-xl font-semibold mb-4'>
          Empleados registrados
        </h2>

        <div className='flex flex-col gap-3'>

          {employees.map(employee => (
            <div
              key={employee.id}
              className='border rounded-xl p-4 flex justify-between items-center'
            >
              <div>
                <h3 className='font-semibold'>
                  {employee.name}
                </h3>

                <p className='text-gray-500'>
                  {employee.email}
                </p>
              </div>

              <span className='bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm'>
                Activo
              </span>
            </div>
          ))}

        </div>

      </div>

    </div>
  )
}

export default EmployeesPage