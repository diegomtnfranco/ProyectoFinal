import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores';
import { type RegisterClientDto } from '../../../types/auth.types';

function RegisterForm() {
  const navigate = useNavigate();
  const { registerClient, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones básicas
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Por favor, completá todos los campos.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('El formato del correo electrónico no es válido.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      const registerData: RegisterClientDto = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || 'pendiente',
      };

      await registerClient(registerData);
      navigate('/');
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : '';
      
      if (errorMessage.includes('email') || errorMessage.includes('registrado')) {
        setError('Este email ya está registrado. ¿Querés iniciar sesión?');
      } else if (errorMessage.includes('verificar')) {
        setError('Te enviamos un email de verificación. Revisá tu bandeja de entrada.');
      } else {
        setError(errorMessage || 'Error al crear la cuenta. Intente nuevamente.');
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='bg-white shadow-xl rounded-3xl p-8 w-full max-w-md flex flex-col gap-6'
    >
      <div>
        <h1 className='text-3xl font-bold'>Crear cuenta</h1>
        <p className='text-gray-500'>Unite a EstacionamientoTUC</p>
      </div>

      {/* Selector de Rol - Comentado pero mantenido */}
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
          minLength={6}
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
  );
}

export default RegisterForm;