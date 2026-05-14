import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/auth.service'

function LoginForm() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError('')

      const data = await login({
        email,
        password,
      })

      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))

      
      navigate('/client')
    } catch (err) {
      setError('Credenciales inválidas')
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
        <h1 className='text-3xl font-bold text-gray-900'>Bienvenido</h1>
        <p className='text-gray-500'>Ingresá para continuar</p>
      </div>

      <div className='flex flex-col gap-2'>
        <label className='font-medium text-gray-700'>Email</label>
        <input
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='ejemplo@mail.com'
          required
          className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all'
        />
      </div>

      <div className='flex flex-col gap-2'>
        <label className='font-medium text-gray-700'>Contraseña</label>
        <input
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder='********'
          required
          className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all'
        />
      </div>

      {error && (
        <div className='bg-red-100 text-red-600 p-3 rounded-xl text-sm font-medium'>
          {error}
        </div>
      )}

      <button
        type='submit'
        disabled={loading}
        className='bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 transition-all text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-100'
      >
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>

      
      <div className='text-center mt-2'>
        <p className='text-gray-500 text-sm'>
          ¿No tenés cuenta?{' '}
          <button
            type='button'
            onClick={() => navigate('/register')}
            className='text-blue-600 font-bold hover:underline'
          >
            Registrate acá
          </button>
        </p>
      </div>
    </form>
  )
}

export default LoginForm