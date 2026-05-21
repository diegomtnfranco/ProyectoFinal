import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
// a conectar a auth.service.ts
// import { register } from '../services/auth.service'

function RegisterForm() {
  const navigate = useNavigate()

  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'driver' | 'owner'>('driver')

  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError('')

      //  cuando Diego lo habilite:
      /*
      const data = await register({ name, email, password, role })
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      */
      
      // Simulación temporal
      console.log('Registrando:', { name, email, password, role })
      navigate('/')
      
    } catch (err) {
      setError('Error al crear la cuenta. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='bg-white shadow-xl rounded-3xl p-8 w-full max-w-md flex flex-col gap-6'
    >
      <div>
        <h1 className='text-3xl font-bold'>Crear cuenta</h1>
        <p className='text-gray-500'>Unite a EstacionamientoTUC</p>
      </div>

      {/* Selector de Rol */}
      <div className='flex gap-4'>
        {/* <button
          type='button'
          onClick={() => setRole('driver')}
          className={`flex-1 py-3 rounded-xl font-semibold border-2 transition-all ${
            role === 'driver'
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-gray-200 text-gray-500 hover:border-blue-200'
          }`}
        >
          Conductor
        </button> */}
        {/* <button
          type='button'
          onClick={() => setRole('owner')}
          className={`flex-1 py-3 rounded-xl font-semibold border-2 transition-all ${
            role === 'owner'
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-gray-200 text-gray-500 hover:border-blue-200'
          }`}
        >
          Operador
        </button> */}
      </div>

      <div className='flex flex-col gap-2'>
        <label className='font-medium'>Nombre completo</label>
        <input
          type='text'
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Juan Pérez'
          required
          className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
        />
      </div>

      <div className='flex flex-col gap-2'>
        <label className='font-medium'>Email</label>
        <input
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='ejemplo@mail.com'
          required
          className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
        />
      </div>

      <div className='flex flex-col gap-2'>
        <label className='font-medium'>Contraseña</label>
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

      {error && (
        <div className='bg-red-100 text-red-600 p-3 rounded-xl'>
          {error}
        </div>
      )}

      <button
        type='submit'
        disabled={loading}
        className='bg-blue-500 hover:bg-blue-600 transition-all text-white font-semibold py-3 rounded-xl'
      >
        {loading ? 'Creando cuenta...' : 'Registrarme'}
      </button>

      <button
        type='button'
        onClick={() => navigate('/create-company')}
        className='border-2 border-blue-500 text-blue-500 hover:bg-blue-50 transition-all font-semibold py-3 rounded-xl'
      >
        Crear empresa
      </button>
      {/* <p className='text-center text-sm text-gray-500'>
        ¿Ya tenés cuenta?{' '}
        <span 
          onClick={() => navigate('/')} 
          className='text-blue-500 font-semibold cursor-pointer hover:underline'
        >
          Ingresá acá
        </span>
      </p> */}
    </form>
  )
}

export default RegisterForm