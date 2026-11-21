import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Car } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useClientVehiclesStore } from '../../../stores/clientVehiclesStore';
import { UserRole } from '../../../types/auth.types';
import { consumeQrReturn, peekQrReturn } from '../../qr/qrReturn';

const PROFILE_PATH = '/client/profile';

/**
 * Registro obligatorio de vehículo (solo clientes). Montado en el layout del
 * cliente: si la cuenta no tiene vehículos muestra un aviso que no se puede
 * cerrar y solo deja ir a Perfil > Vehículos. El backend aplica la misma regla
 * (no es solo visual). Un error al cargar los vehículos no bloquea la app.
 *
 * También retoma la salida por QR si el cliente tuvo que iniciar sesión o
 * registrar su vehículo antes de pagar.
 */
function VehicleRequiredGate() {
  const user = useAuthStore((s) => s.user);
  const { vehicles, status, load } = useClientVehiclesStore();
  const location = useLocation();
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isClient = user?.role === UserRole.CLIENT;
  const missing = isClient && status === 'ready' && vehicles.length === 0;
  const onProfile = location.pathname.startsWith(PROFILE_PATH);
  const blocking = missing && !onProfile;

  useEffect(() => {
    if (isClient && user?.id) void load(user.id);
  }, [isClient, user?.id, load]);

  // Volver al QR de salida una vez que el cliente ya tiene vehículo
  useEffect(() => {
    if (isClient && status === 'ready' && vehicles.length > 0 && peekQrReturn()) {
      const target = consumeQrReturn();
      if (target) navigate(target, { replace: true });
    }
  }, [isClient, status, vehicles.length, navigate]);

  useEffect(() => {
    if (!blocking) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    buttonRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [blocking]);

  if (!blocking) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-required-title"
      aria-describedby="vehicle-required-text"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl sm:max-w-md sm:p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Car size={32} className="text-blue-600" aria-hidden="true" />
        </div>
        <h2 id="vehicle-required-title" className="text-xl font-bold text-gray-900 sm:text-2xl">
          ¡Antes de continuar!
        </h2>
        <p id="vehicle-required-text" className="mt-2 text-sm text-gray-600 sm:text-base">
          Necesitamos que registres al menos un vehículo en tu perfil para que podamos identificarlo al ingresar y salir de los
          estacionamientos.
        </p>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => navigate(`${PROFILE_PATH}?tab=vehicles`)}
          className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Registrar mi vehículo
        </button>
      </div>
    </div>
  );
}

export default VehicleRequiredGate;
