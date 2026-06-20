// frontend/src/features/auth/components/LoginForm.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole, type LoginDto } from '../../../types/auth.types';
import { useAuthStore } from '../../../stores';

function LoginForm() {
  const navigate = useNavigate();
  
  // Estados locales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [showResendButton, setShowResendButton] = useState(false);
  
  // Estados del store
  const { user, token, login, isLoading, clearError } = useAuthStore();

  // ✅ Redirigir si ya está autenticado
  useEffect(() => {
    if (token && user) {
      switch (user.role) {
        case UserRole.ADMIN:
          navigate('/admin');
          break;
        case UserRole.PARKING_OWNER:
          navigate('/owner');
          break;
        case UserRole.PARKING_EMPLOYEE:
          navigate('/employee');
          break;
        case UserRole.CLIENT:
          navigate('/client');
          break;
        default:
          navigate('/');
          break;
      }
    }
  }, [token, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setShowResendButton(false);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Por favor, completá todos los campos para ingresar.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setLocalError('El formato del correo electrónico no es válido.');
      return;
    }
    if (password.length < 8) {
      setLocalError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      const loginData: LoginDto = { email, password };
      await login(loginData);
      
      // El useEffect se encargará de redirigir
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : '';
      
      console.log('Error capturado:', errorMessage);
      
      if (errorMessage.includes('verificar') || errorMessage.includes('Debes verificar')) {
        setLocalError('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
        setShowResendButton(true);
      } else if (errorMessage.includes('aprobación') || errorMessage.includes('pendiente')) {
        setLocalError('Tu cuenta está pendiente de aprobación por el administrador. Te notificaremos cuando sea aceptada.');
      } else if (errorMessage.includes('desactivada')) {
        setLocalError('Tu cuenta ha sido desactivada. Contacta al administrador.');
      } else {
        setLocalError(errorMessage || 'Credenciales inválidas o error de conexión.');
      }
    }
  };

  const handleResendVerification = async () => {
    try {
      const { authService } = await import('../../../services/auth.service');
      await authService.resendVerification(email);
      setLocalError('Se ha reenviado el email de verificación. Revisa tu bandeja de entrada.');
      setShowResendButton(false);
    } catch (err) {
      setLocalError('No se pudo reenviar el email. Intenta nuevamente.');
    }
  };

  // Mostrar loading mientras verifica autenticación
  if (isLoading && !user) {
    return (
      <div className="bg-white shadow-xl rounded-3xl p-8 w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si ya está autenticado, mostrar loading (el useEffect redirigirá)
  if (token && user) {
    return (
      <div className="bg-white shadow-xl rounded-3xl p-8 w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-3xl p-8 w-full max-w-md flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bienvenido</h1>
        <p className="text-gray-500">Ingresá para continuar</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ejemplo@mail.com"
          required
          disabled={isLoading}
          className="border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-100"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-medium text-gray-700">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="********"
          required
          disabled={isLoading}
          className="border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-100"
        />
        
        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-blue-600 font-medium hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>

      {(localError) && (
        <div className="bg-red-100 text-red-600 p-3 rounded-xl text-sm font-medium">
          {localError}
        </div>
      )}

      {showResendButton && (
        <button
          type="button"
          onClick={handleResendVerification}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          ¿No recibiste el email? Reenviar verificación
        </button>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 transition-all text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-100"
      >
        {isLoading ? 'Ingresando...' : 'Ingresar'}
      </button>

      <div className="text-center mt-2">
        <p className="text-gray-500 text-sm">
          ¿No tenés cuenta?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-blue-600 font-bold hover:underline"
          >
            Registrate acá
          </button>
        </p>
      </div>
    </form>
  );
}

export default LoginForm;