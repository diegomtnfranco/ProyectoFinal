import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function ForgotPassword() {
  const navigate = useNavigate()

  //  simulacion envio d mail
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('') 

    // valida que no esté vacío
    if (!email.trim()) {
      setError('Por favor, ingresá tu correo electrónico.')
      return
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setError('Ingresá un correo electrónico válido (ej: usuario@mail.com).')
      return
    }

    setLoading(true)
    console.log(`[QA Test] Envío de recuperación de contraseña a: ${email}`)

    
    setTimeout(() => {
      setLoading(false)
      setEnviado(true)
    }, 2000)
  }

 return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      
      <div className='bg-white shadow-xl rounded-3xl p-8 w-full max-w-md flex flex-col gap-6'>
        
        {!enviado && (
         <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-6'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>¿No recordas tu contraseña?</h1>
              <p className='text-gray-500 mt-1'>Ingresá tu mail para recibir un enlace de recuperación.</p>
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

                       {error && (
              <div className='bg-red-100 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-200'>
                {error}
              </div>
            )}

            <button
              type='submit'
              disabled={loading}
              className='bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 transition-all text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-100'
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>

            <div className='text-center'>
              <button
                type='button'
                onClick={() => navigate('/')}
                className='text-sm text-gray-500 font-medium hover:underline'
              >
                Volver al inicio
              </button>
            </div>
          </form>
        )}

        {enviado && (
          <div className='flex flex-col gap-6 text-center py-6'>
            <div className='text-6xl'>✉️</div>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>¡Mail Enviado!</h1>
              <p className='text-gray-500 mt-2'> <strong className='text-gray-700'>{email}</strong> Te enviamos un enlace para recuperar tu contraseña. No olvides revisar tu carpeta spam.</p>
            </div>
            
            <button
              onClick={() => navigate('/')}
              className='bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-100'
            >
              Volver al inicio
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default ForgotPassword