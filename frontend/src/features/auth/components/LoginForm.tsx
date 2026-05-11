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
        <h1 className='text-3xl font-bold'>Bienvenido</h1>

        <p className='text-gray-500'>Ingresá para continuar</p>
      </div>

      <div className='flex flex-col gap-2'>
        <label className='font-medium'>Email</label>

        <input
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='ejemplo@mail.com'
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
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  )
}

export default LoginForm