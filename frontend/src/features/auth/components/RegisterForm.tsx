// frontend/src/features/auth/components/RegisterForm.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores';
import { useToast } from '../../../shared/hooks/useToast';
import { type RegisterClientDto } from '../../../types/auth.types';
import { CheckCircle, XCircle, Info } from 'lucide-react';

function RegisterForm() {
  const navigate = useNavigate();
  const { registerClient, isLoading, lastRegisterMessage, clearRegisterMessage } = useAuthStore();
  const { showSuccess, showError } = useToast();
    const { user, token, isLoading: authLoading } = useAuthStore();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

useEffect(() => {
    if (token && user) {
      // Si ya es dueño, redirigir a su dashboard
      if (user.role === 'parking_owner') {
        navigate('/owner');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'client') {
        // Si es cliente, no debería estar aquí, redirigir a su dashboard
        navigate('/client');
      }
    }
  }, [token, user, navigate]);

  // Verificar si hay un mensaje de registro exitoso
  useEffect(() => {
    if (lastRegisterMessage) {
      setSuccessMessage(lastRegisterMessage);
      setShowSuccessModal(true);
      clearRegisterMessage();
    }
  }, [lastRegisterMessage, clearRegisterMessage]);

  // Validación de fortaleza de contraseña
  const getPasswordStrengthErrors = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('• Mínimo 8 caracteres');
    if (!/[A-Z]/.test(pwd)) errors.push('• Al menos una mayúscula');
    if (!/[a-z]/.test(pwd)) errors.push('• Al menos una minúscula');
    if (!/[0-9]/.test(pwd)) errors.push('• Al menos un número');
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) errors.push('• Al menos un carácter especial');
    return errors;
  };

  const isPasswordValid = (pwd: string): boolean => {
    return getPasswordStrengthErrors(pwd).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar campos requeridos
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Por favor, completá todos los campos.');
      return;
    }

    // Validar email
    if (!email.includes('@') || !email.includes('.')) {
      setError('El formato del correo electrónico no es válido.');
      return;
    }

    // Validar fortaleza de contraseña
    if (!isPasswordValid(password)) {
      setError('La contraseña no cumple con los requisitos de seguridad.');
      return;
    }

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      const registerData: RegisterClientDto = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        phone: phone.trim() || undefined,
      };

      await registerClient(registerData);
      // No navegar automáticamente, mostrar modal de éxito
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : '';
      
      if (errorMessage.includes('email') || errorMessage.includes('registrado')) {
        setError('Este email ya está registrado. ¿Querés iniciar sesión?');
      } else if (errorMessage.includes('verificar')) {
        setError('Error al enviar el email de verificación. Intentá nuevamente.');
      } else {
        setError(errorMessage || 'Error al crear la cuenta. Intente nuevamente.');
      }
      showError(errorMessage || 'Error al crear la cuenta');
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    navigate('/');
  };

  const passwordErrors = getPasswordStrengthErrors(password);
  const showPasswordRequirements = password.length > 0 && !isPasswordValid(password);
  const doPasswordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const showPasswordMismatch = confirmPassword.length > 0 && !doPasswordsMatch;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className='bg-white shadow-xl rounded-3xl p-8 w-full max-w-md flex flex-col gap-6'
      >
        <div>
          <h1 className='text-3xl font-bold'>Crear cuenta</h1>
          <p className='text-gray-500'>Unite a EstacionamientoTUC</p>
        </div>

        <div className='flex flex-col gap-2'>
          <label className='font-medium'>Nombre completo</label>
          <input
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Juan Pérez'
            required
            disabled={isLoading}
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
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
            disabled={isLoading}
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
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
            disabled={isLoading}
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
          />
          {showPasswordRequirements && (
            <div className='mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200'>
              <p className='text-xs font-semibold text-yellow-800 mb-1'>Requisitos de contraseña:</p>
              <ul className='text-xs text-yellow-700 space-y-0.5'>
                {passwordErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className='flex flex-col gap-2'>
          <label className='font-medium'>Confirmar contraseña</label>
          <input
            type='password'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder='********'
            required
            disabled={isLoading}
            className={`border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${
              showPasswordMismatch ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {showPasswordMismatch && (
            <p className='text-red-500 text-xs mt-1'>Las contraseñas no coinciden</p>
          )}
          {doPasswordsMatch && password.length > 0 && (
            <p className='text-green-500 text-xs mt-1'>✓ Las contraseñas coinciden</p>
          )}
        </div>

        <div className='flex flex-col gap-2'>
          <label className='font-medium'>Teléfono (opcional)</label>
          <input
            type='tel'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder='+54 381 1234567'
            disabled={isLoading}
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
          />
        </div>

        {error && (
          <div className='bg-red-100 text-red-600 p-3 rounded-xl text-sm'>
            {error}
          </div>
        )}

        <button
          type='submit'
          disabled={isLoading}
          className='bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 transition-all text-white font-semibold py-3 rounded-xl'
        >
          {isLoading ? 'Creando cuenta...' : 'Registrarme'}
        </button>

        <button
          type='button'
          onClick={() => navigate('/create-company')}
          className='border-2 border-blue-500 text-blue-500 hover:bg-blue-50 transition-all font-semibold py-3 rounded-xl'
          disabled={isLoading}
        >
          Crear empresa
        </button>
      </form>

      {/* Modal de éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center flex flex-col gap-6 shadow-2xl animate-fade-in">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Registro exitoso!</h2>
              <p className="text-gray-600">{successMessage}</p>
            </div>
            <button
              onClick={handleCloseModal}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg transition-all"
            >
              Ir al inicio de sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default RegisterForm;