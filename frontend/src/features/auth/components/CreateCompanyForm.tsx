// import { useState } from 'react'
// import { useNavigate } from 'react-router-dom'

// function CreateCompanyForm() {
//   const navigate = useNavigate()

//   const [fullName, setFullName] = useState('')
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [repeatPassword, setRepeatPassword] = useState('')
//   const [parkingName, setParkingName] = useState('')
//   const [capacity, setCapacity] = useState('')
//   const [acceptReservations, setAcceptReservations] = useState('')

//   const [error, setError] = useState('')

//   // Validación de contraseñas
//   const passwordsMatch =
//     password === repeatPassword || repeatPassword === ''

//   // Validación completa del formulario
//   const isFormValid =
//     fullName.trim() !== '' &&
//     email.trim() !== '' &&
//     password.trim() !== '' &&
//     repeatPassword.trim() !== '' &&
//     parkingName.trim() !== '' &&
//     capacity.trim() !== '' &&
//     acceptReservations.trim() !== '' &&
//     password === repeatPassword

//   const handleNext = (e: React.FormEvent) => {
//     e.preventDefault()

//     if (!isFormValid) {
//       setError('Completá todos los campos correctamente')
//       return
//     }

//     // Guardar temporalmente los datos
//     const companyData = {
//       fullName,
//       email,
//       password,
//       parkingName,
//       capacity,
//       acceptReservations: acceptReservations === 'si',
//     }

//     localStorage.setItem(
//       'companyData',
//       JSON.stringify(companyData)
//     )

//     navigate('/company-location')
//   }

//   return (
//     <div className='min-h-screen flex items-center justify-center bg-gray-100 p-4'>
//       <form
//         onSubmit={handleNext}
//         className='bg-white shadow-xl rounded-3xl p-8 w-full max-w-lg flex flex-col gap-5'
//       >
//         <div>
//           <h1 className='text-3xl font-bold'>
//             Crear Empresa
//           </h1>

//           <p className='text-gray-500'>
//             Registrá tu estacionamiento
//           </p>
//         </div>

//         {/* Nombre */}
//         <div className='flex flex-col gap-2'>
//           <label className='font-medium'>
//             Nombre completo
//           </label>

//           <input
//             type='text'
//             value={fullName}
//             onChange={(e) => setFullName(e.target.value)}
//             placeholder='Juan Pérez'
//             required
//             className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
//           />
//         </div>

//         {/* Email */}
//         <div className='flex flex-col gap-2'>
//           <label className='font-medium'>Email</label>

//           <input
//             type='email'
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             placeholder='empresa@mail.com'
//             required
//             className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
//           />
//         </div>

//         {/* Contraseña */}
//         <div className='flex flex-col gap-2'>
//           <label className='font-medium'>
//             Contraseña
//           </label>

//           <input
//             type='password'
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             placeholder='********'
//             required
//             minLength={6}
//             className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
//           />
//         </div>

//         {/* Repetir contraseña */}
//         <div className='flex flex-col gap-2'>
//           <label className='font-medium'>
//             Repetir contraseña
//           </label>

//           <input
//             type='password'
//             value={repeatPassword}
//             onChange={(e) => setRepeatPassword(e.target.value)}
//             placeholder='********'
//             required
//             minLength={6}
//             className={`border rounded-xl px-4 py-3 outline-none focus:ring-2 ${
//               passwordsMatch
//                 ? 'border-gray-300 focus:ring-blue-500'
//                 : 'border-red-500 focus:ring-red-500'
//             }`}
//           />

//           {!passwordsMatch && (
//             <p className='text-red-500 text-sm'>
//               Las contraseñas no coinciden
//             </p>
//           )}
//         </div>

//         {/* Nombre estacionamiento */}
//         <div className='flex flex-col gap-2'>
//           <label className='font-medium'>
//             Nombre del estacionamiento
//           </label>

//           <input
//             type='text'
//             value={parkingName}
//             onChange={(e) => setParkingName(e.target.value)}
//             placeholder='Parking Centro'
//             required
//             className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
//           />
//         </div>

//         {/* Capacidad */}
//         <div className='flex flex-col gap-2'>
//           <label className='font-medium'>
//             Capacidad total de vehículos
//           </label>

//           <input
//             type='number'
//             value={capacity}
//             onChange={(e) => setCapacity(e.target.value)}
//             placeholder='100'
//             required
//             min={1}
//             className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
//           />
//         </div>

//         {/* Reservas */}
//         <div className='flex flex-col gap-2'>
//           <label className='font-medium'>
//             ¿Aceptarán reservas?
//           </label>

//           <select
//             value={acceptReservations}
//             onChange={(e) =>
//               setAcceptReservations(e.target.value)
//             }
//             required
//             className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
//           >
//             <option value=''>
//               Seleccionar opción
//             </option>

//             <option value='si'>Sí</option>

//             <option value='no'>No</option>
//           </select>
//         </div>

//         {/* Error */}
//         {error && (
//           <div className='bg-red-100 text-red-600 p-3 rounded-xl'>
//             {error}
//           </div>
//         )}

//         {/* Botón siguiente */}
//         <button
//           type='submit'
//           disabled={!isFormValid}
//           className={`text-white font-semibold py-3 rounded-xl transition-all ${
//             isFormValid
//               ? 'bg-blue-500 hover:bg-blue-600'
//               : 'bg-gray-400 cursor-not-allowed'
//           }`}
//         >
//           Siguiente
//         </button>

//         {/* Volver */}
//         <button
//           type='button'
//           onClick={() => navigate('/register')}
//           className='text-gray-500 hover:text-gray-700'
//         >
//           Volver
//         </button>
//       </form>
//     </div>
//   )
// }

// export default CreateCompanyForm

// frontend/src/features/owner/components/CreateCompanyForm.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../shared/hooks/useToast';

function CreateCompanyForm() {
  const navigate = useNavigate();
  const { showError } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [parkingName, setParkingName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [acceptReservations, setAcceptReservations] = useState('');
  const [phone, setPhone] = useState('');
  const [cuit, setCuit] = useState('');

  const [error, setError] = useState('');

  // Cargar datos guardados al montar el componente
  useEffect(() => {
    const savedData = localStorage.getItem('companyData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setFullName(data.fullName || '');
      setEmail(data.email || '');
      setPassword(data.password || '');
      setConfirmPassword(data.confirmPassword || '');
      setParkingName(data.parkingName || '');
      setCapacity(data.capacity ? String(data.capacity) : '');
      setAcceptReservations(data.acceptReservations || '');
      setPhone(data.phone || '');
      setCuit(data.cuit || '');
    }
  }, []);

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

  // Validación de CUIT (formato XX-XXXXXXXX-X)
  const isValidCUIT = (cuit: string): boolean => {
    const cuitRegex = /^\d{2}-\d{8}-\d$/;
    return cuitRegex.test(cuit);
  };

  // Validación de coincidencia de contraseñas
  const passwordsMatch = password === confirmPassword;

  // Validación completa del formulario
  const isFormValid =
    fullName.trim() !== '' &&
    email.trim() !== '' &&
    password.trim() !== '' &&
    confirmPassword.trim() !== '' &&
    isPasswordValid(password) &&
    passwordsMatch &&
    parkingName.trim() !== '' &&
    capacity.trim() !== '' &&
    acceptReservations.trim() !== '' &&
    Number(capacity) > 0 &&
    Number(capacity) <= 150;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      if (!passwordsMatch) {
        setError('Las contraseñas no coinciden');
      } else if (!isPasswordValid(password)) {
        setError('La contraseña no cumple con los requisitos de seguridad');
      } else if (Number(capacity) > 150) {
        setError('La capacidad máxima permitida es de 150 espacios');
      } else {
        setError('Completá todos los campos correctamente');
      }
      return;
    }

    // Guardar todos los datos incluyendo confirmPassword
    const companyData = {
      fullName,
      email,
      password,
      confirmPassword,
      parkingName,
      capacity: Number(capacity),
      acceptReservations: acceptReservations === 'si',
      phone: phone.trim() || '',
      cuit: cuit.trim() || '',
    };

    localStorage.setItem('companyData', JSON.stringify(companyData));
    navigate('/company-location');
  };

  const passwordErrors = getPasswordStrengthErrors(password);
  const showPasswordRequirements = password.length > 0 && !isPasswordValid(password);
  const showPasswordMismatch = confirmPassword.length > 0 && !passwordsMatch;

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100 p-4'>
      <form
        onSubmit={handleNext}
        className='bg-white shadow-xl rounded-3xl p-8 w-full max-w-lg flex flex-col gap-5'
      >
        <div>
          <h1 className='text-3xl font-bold'>Crear Empresa</h1>
          <p className='text-gray-500'>Registrá tu estacionamiento</p>
        </div>

        {/* Nombre completo */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>Nombre completo</label>
          <input
            type='text'
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder='Juan Pérez'
            required
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {/* Email */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>Email</label>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='empresa@mail.com'
            required
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {/* Teléfono (opcional) */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>Teléfono (opcional)</label>
          <input
            type='tel'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder='+54 381 1234567'
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {/* CUIT (opcional) */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>CUIT (opcional)</label>
          <input
            type='text'
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            placeholder='30-12345678-9'
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          />
          {cuit && !isValidCUIT(cuit) && (
            <p className='text-red-500 text-xs'>Formato inválido. Ejemplo: 30-12345678-9</p>
          )}
        </div>

        {/* Contraseña */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>Contraseña</label>
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder='********'
            required
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
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

        {/* Confirmar contraseña */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>Confirmar contraseña</label>
          <input
            type='password'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder='********'
            required
            className={`border rounded-xl px-4 py-3 outline-none focus:ring-2 ${
              showPasswordMismatch ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {showPasswordMismatch && (
            <p className='text-red-500 text-sm'>Las contraseñas no coinciden</p>
          )}
          {passwordsMatch && password.length > 0 && (
            <p className='text-green-500 text-sm'>✓ Las contraseñas coinciden</p>
          )}
        </div>

        {/* Nombre estacionamiento */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>Nombre del estacionamiento</label>
          <input
            type='text'
            value={parkingName}
            onChange={(e) => setParkingName(e.target.value)}
            placeholder='Parking Centro'
            required
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {/* Capacidad */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>Capacidad total de vehículos (1-150)</label>
          <input
            type='number'
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder='100'
            required
            min={1}
            max={150}
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          />
          {Number(capacity) > 150 && (
            <p className='text-red-500 text-sm'>La capacidad máxima permitida es de 150 espacios</p>
          )}
        </div>

        {/* Reservas */}
        <div className='flex flex-col gap-2'>
          <label className='font-medium'>¿Aceptarán reservas?</label>
          <select
            value={acceptReservations}
            onChange={(e) => setAcceptReservations(e.target.value)}
            required
            className='border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value=''>Seleccionar opción</option>
            <option value='si'>Sí</option>
            <option value='no'>No</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className='bg-red-100 text-red-600 p-3 rounded-xl text-sm'>
            {error}
          </div>
        )}

        {/* Botón siguiente */}
        <button
          type='submit'
          disabled={!isFormValid}
          className={`text-white font-semibold py-3 rounded-xl transition-all ${
            isFormValid ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Siguiente
        </button>

        {/* Volver */}
        <button
          type='button'
          onClick={() => navigate('/register')}
          className='text-gray-500 hover:text-gray-700'
        >
          Volver
        </button>
      </form>
    </div>
  );
}

export default CreateCompanyForm;