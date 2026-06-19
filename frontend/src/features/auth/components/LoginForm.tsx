import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole, type LoginDto } from '../../../types/auth.types';
import { useAuthStore } from '../../../stores';

function LoginForm() {
  const navigate = useNavigate();
  
  // Estado local del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [showResendButton, setShowResendButton] = useState(false);
  
  // Estados y acciones del store global
  const { login, isLoading, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setShowResendButton(false);
    clearError();

    // Validaciones básicas del formulario
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
      
      // Usar el store para login
      await login(loginData);
      
      // Obtener el usuario actualizado del store
      const user = useAuthStore.getState().user;
      
      if (!user) {
        throw new Error('No se pudo obtener el usuario');
      }
      
      // Redirigir según el rol
      switch (user.role) {
        case UserRole.ADMIN:
          navigate('/admin');
          break;
        case UserRole.PARKING_OWNER:
          navigate('/owner');
          break;
        case UserRole.PARKING_EMPLOYEE:
          navigate('/employee/dashboard');
          break;
        default:
          navigate('/client');
          break;
      }
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : '';
      
      console.log('Error capturado:', errorMessage);
      
      // Manejo específico según el mensaje de error
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

      {/* Mostrar error local o error global del store */}
      {(localError) && (
        <div className="bg-red-100 text-red-600 p-3 rounded-xl text-sm font-medium">
          {localError}
        </div>
      )}

      {/* Botón de reenvío de verificación */}
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