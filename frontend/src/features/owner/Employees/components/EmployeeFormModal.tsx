import { useState } from 'react';
import { useEmployeeStore } from '../../../../stores/employeeStore';
import { useToast } from '../../../../shared/hooks/useToast';
import { X, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  parkingLotId?: string;
  onSuccess?: () => void;
}

function EmployeeFormModal({ isOpen, onClose, parkingLotId, onSuccess }: Props) {
  const { createEmployee } = useEmployeeStore();
  const { showSuccess, showError } = useToast();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [position, setPosition] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const passwordsMatch = password === confirmPassword;
  const isFormValid = name.trim() !== '' && 
                      email.trim() !== '' && 
                      isPasswordValid(password) && 
                      passwordsMatch &&
                      !!parkingLotId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!parkingLotId) {
      showError('No se encontró el estacionamiento');
      return;
    }

    if (!isFormValid) {
      if (!passwordsMatch) showError('Las contraseñas no coinciden');
      else if (!isPasswordValid(password)) showError('La contraseña no cumple con los requisitos');
      else showError('Completá todos los campos correctamente');
      return;
    }

    setLoading(true);
    try {
      await createEmployee({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        parkingLotId,
        position: position.trim() || undefined,
      }, parkingLotId);
      
      showSuccess('Empleado registrado exitosamente. Se ha enviado un email de verificación.');
      onSuccess?.();
      onClose();
      
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPosition('');
    } catch (error) {
      const errorMsg = typeof error === 'string' ? error : 'Error al registrar empleado';
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const passwordErrors = getPasswordStrengthErrors(password);
  const showPasswordRequirements = password.length > 0 && !isPasswordValid(password);
  const showPasswordMismatch = confirmPassword.length > 0 && !passwordsMatch;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold">Registrar empleado</h2>
            <p className="text-sm text-gray-500">Creá una cuenta para el nuevo empleado</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empleado@parking.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {showPasswordRequirements && (
              <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs font-semibold text-yellow-800 mb-1">Requisitos:</p>
                <ul className="text-xs text-yellow-700 space-y-0.5">
                  {passwordErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
                className={`w-full border rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 ${
                  showPasswordMismatch ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {showPasswordMismatch && (
              <p className="text-red-500 text-xs mt-1">Las contraseñas no coinciden</p>
            )}
            {passwordsMatch && password.length > 0 && (
              <p className="text-green-500 text-xs mt-1 flex items-center gap-1">
                <CheckCircle size={12} /> Las contraseñas coinciden
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Puesto (opcional)
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Ej: Cajero, Supervisor, Vigilancia"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                !loading && isFormValid
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Registrando...' : 'Registrar empleado'}
            </button>
          </div>
        </form>

        <div className="p-5 pt-0 border-t border-gray-100 mt-2">
          <p className="text-xs text-gray-400 text-center">
            Se enviará un email de verificación al empleado con sus credenciales.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmployeeFormModal;