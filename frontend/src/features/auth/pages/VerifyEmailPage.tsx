import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu cuenta, por favor espera...');
  const { verifyEmail, isLoading } = useAuthStore();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Falta el token de verificación o el enlace no es válido.');
      return;
    }

    const confirmAccount = async () => {
      try {
        await verifyEmail(token);
        setStatus('success');
        setMessage('¡Cuenta verificada exitosamente!');
      } catch (error) {
        console.error('Error al verificar la cuenta:', error);
        const errorMessage = typeof error === 'string' ? error : 'El enlace expiró o es inválido. Por favor, intenta de nuevo.';
        setStatus('error');
        setMessage(errorMessage);
      }
    };

    confirmAccount();
  }, [token, verifyEmail]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-3xl p-8 w-full max-w-md text-center flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Verificación de Cuenta</h1>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
            <p className="text-gray-600 font-medium">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
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
            <div className="flex justify-center">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
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