import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../../services/auth.service';
import { useToast } from '../../../shared/hooks/useToast';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const passwordsMatch = newPassword === confirmPassword;
  const showPasswordMismatch = confirmPassword.length > 0 && !passwordsMatch;
  const showPasswordRequirements = newPassword.length > 0 && !isPasswordValid(newPassword);

  useEffect(() => {
    if (!token) {
      setError('El enlace de recuperación no es válido o faltó el token de seguridad.');
      showError('Token inválido o expirado');
    }
  }, [token, showError]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      const errorMsg = 'El enlace de recuperación no es válido.';
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    if (!newPassword || !confirmPassword) {
      const errorMsg = 'Completá ambas contraseñas.';
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    if (newPassword.length < 8) {
      const errorMsg = 'La contraseña debe tener al menos 8 caracteres.';
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    if (!isPasswordValid(newPassword)) {
      const errorMsg = 'La contraseña no cumple con los requisitos de seguridad.';
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    if (!passwordsMatch) {
      const errorMsg = 'Las contraseñas no coinciden.';
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    try {
      setLoading(true);
      const response = await authService.resetPassword(
        token,
        newPassword,
        confirmPassword,
      );
      setSuccess(response.message || 'Tu contraseña se actualizó correctamente.');
      showSuccess('¡Contraseña actualizada! Ya puedes iniciar sesión.');
      setNewPassword('');
      setConfirmPassword('');
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'No se pudo actualizar la contraseña.';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const passwordErrors = getPasswordStrengthErrors(newPassword);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-100">
        <div className="mb-6 flex items-center gap-3 text-blue-600">
          <div className="rounded-2xl bg-blue-50 p-3">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Restablecer contraseña</h1>
            <p className="text-sm text-slate-500">Define una nueva contraseña para tu cuenta.</p>
          </div>
        </div>

        {!token ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <XCircle className="h-4 w-4" /> Enlace inválido
            </div>
            <p>Este acceso solo está habilitado desde el email de recuperación enviado por el servicio externo.</p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Solicitar nuevo enlace →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nueva contraseña */}
            <label className="block text-sm font-medium text-slate-700">
              Nueva contraseña
              <div className="relative mt-2">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {/* Requisitos de contraseña */}
            {showPasswordRequirements && (
              <div className="rounded-xl bg-yellow-50 p-3 border border-yellow-200">
                <p className="text-xs font-semibold text-yellow-800 mb-1">Requisitos de contraseña:</p>
                <ul className="text-xs text-yellow-700 space-y-0.5">
                  {passwordErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confirmar contraseña */}
            <label className="block text-sm font-medium text-slate-700">
              Confirmar contraseña
              <div className="relative mt-2">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 pr-12 text-sm outline-none transition focus:bg-white focus:ring-2 ${
                    showPasswordMismatch
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'
                  }`}
                  placeholder="Repetí la nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {/* Indicador de coincidencia */}
            {showPasswordMismatch && (
              <p className="text-red-500 text-xs mt-1">Las contraseñas no coinciden</p>
            )}
            {passwordsMatch && newPassword.length > 0 && isPasswordValid(newPassword) && (
              <p className="text-green-500 text-xs mt-1 flex items-center gap-1">
                <CheckCircle2 size={12} /> Las contraseñas coinciden
              </p>
            )}

            {/* Errores */}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Éxito */}
            {success && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Botón submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando...
                </span>
              ) : (
                'Actualizar contraseña'
              )}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 w-full text-center text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default ResetPasswordPage;