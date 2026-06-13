import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { authService } from '../../../services/auth.service';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      setError('El enlace de recuperación no es válido o faltó el token de seguridad.');
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('El enlace de recuperación no es válido.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Completá ambas contraseñas.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.resetPassword({
        token,
        newPassword,
        confirmPassword,
      });
      setSuccess(response.message || 'Tu contraseña se actualizó correctamente.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

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
            <div className="mb-2 flex items-center gap-2 font-semibold"><XCircle className="h-4 w-4" /> Enlace inválido</div>
            <p>Este acceso solo está habilitado desde el email de recuperación enviado por el servicio externo.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Nueva contraseña
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                placeholder="Mínimo 6 caracteres"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Confirmar contraseña
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                placeholder="Repetí la nueva contraseña"
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            {success && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Guardando...</span> : 'Actualizar contraseña'}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 w-full text-center text-sm font-semibold text-slate-500 hover:text-blue-600"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
