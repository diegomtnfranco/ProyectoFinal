import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu cuenta, por favor espera...');

  // token url mail
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Falta el token de verificación o el enlace no es válido.');
      return;
    }

    // petición al backend con fetch
    const confirmAccount = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: token }) 
        });

        if (!response.ok) {
          throw new Error('Error en la verificación');
        }

        setStatus('success');
        setMessage('¡Cuenta verificada exitosamente!');
      } catch (error) {
        setStatus('error');
        setMessage('El enlace expiró o es inválido. Por favor, intenta de nuevo.');
      }
    };

    confirmAccount();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-3xl p-8 w-full max-w-md text-center flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Verificación de Cuenta</h1>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-600 font-medium">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col gap-4">
            <p className="text-green-600 bg-green-100 p-4 rounded-xl font-medium">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg transition-all"
            >
              Ir al Iniciar Sesión
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-4">
            <p className="text-red-600 bg-red-100 p-4 rounded-xl font-medium">{message}</p>
            <button
              onClick={() => navigate('/register')}
              className="text-blue-600 font-bold hover:underline text-sm"
            >
              Volver al registro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;