import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Bus, Car, CheckCircle2, Loader2, Motorbike } from 'lucide-react';
import { checkoutService } from '../../../services/checkout.service';
import { occupancyServicesService } from '../../../services/occupancy-services.service';
import { PaymentApiError } from '../../../types/payments.types';
import type { CheckInVehicleOption, QrCheckInOptions, QrCheckInResult } from '../../../types/checkout.types';
import type { OfferedService } from '../../../types/occupancy-services.types';
import ServiceCheckboxList from '../../../shared/components/occupancy/ServiceCheckboxList';
import { useToast } from '../../../shared/hooks/useToast';
import { rememberQrReturn } from '../qrReturn';

const VEHICLE_LABEL: Record<string, string> = { car: 'Auto', motorcycle: 'Moto', truck: 'Camioneta', van: 'Camioneta' };
const VEHICLE_ICON: Record<string, typeof Car> = { car: Car, motorcycle: Motorbike, truck: Bus, van: Bus };

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : typeof e === 'string' ? e : fallback);

/** Primer vehículo disponible si es el único que puede ingresar */
const autoSelect = (vehicles: CheckInVehicleOption[]) => {
  const available = vehicles.filter((v) => v.available);
  return available.length === 1 ? available[0].id : null;
};

function unavailableReason(v: CheckInVehicleOption) {
  if (v.parkedAt) return `Ya tiene un ingreso activo en ${v.parkedAt}`;
  if (!v.hasRate) return `Este estacionamiento no tiene tarifa para ${(VEHICLE_LABEL[v.vehicleType] ?? v.vehicleType).toLowerCase()}`;
  return null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-md space-y-4">{children}</div>
    </div>
  );
}

/**
 * Ingreso por QR de un cliente con sesión: elige uno de SUS vehículos
 * registrados (no escribe patente ni tipo). El backend toma patente y tipo del
 * vehículo, así coinciden con el panel del personal y con la tarifa.
 */
function QrCheckInFlow({ token }: { token: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showWarning } = useToast();

  const [options, setOptions] = useState<QrCheckInOptions | null>(null);
  const [error, setError] = useState<{ message: string; vehicleRequired?: boolean } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [services, setServices] = useState<OfferedService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<QrCheckInResult | null>(null);

  const returnPath = `${location.pathname}${location.search}`;

  useEffect(() => {
    let alive = true;
    checkoutService
      .checkInOptions(token)
      .then((o) => {
        if (!alive) return;
        setOptions(o);
        setSelectedId(autoSelect(o.vehicles));
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof PaymentApiError && e.code === 'VEHICLE_REQUIRED') {
          rememberQrReturn(returnPath);
          setError({ message: 'Registrá al menos un vehículo en tu perfil para ingresar con el QR.', vehicleRequired: true });
        } else {
          setError({ message: errorText(e, 'No pudimos leer el QR. Probá de nuevo.') });
        }
      });
    occupancyServicesService
      .getQrServices(token)
      .then((list) => alive && setServices(list))
      .catch(() => alive && setServices([])); // sin servicios el ingreso sigue
    return () => {
      alive = false;
    };
  }, [token, returnPath]);

  const confirm = async () => {
    if (!selectedId || busy) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const r = await checkoutService.checkIn(token, selectedId, selectedServices);
      if (r.ignoredServiceKeys?.length) showWarning('Algún servicio elegido ya no estaba disponible y no se registró');
      setResult(r);
    } catch (e) {
      setSubmitError(errorText(e, 'No se pudo registrar el ingreso'));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Shell>
        <div className="rounded-3xl bg-white p-6 text-center shadow-xl sm:p-8">
          <CheckCircle2 size={56} className="mx-auto mb-3 text-green-500" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-gray-900">¡Bienvenido!</h1>
          <p className="mt-1 text-gray-600">Tu ingreso quedó registrado.</p>
          <div className="mt-5 rounded-2xl bg-green-50 p-4">
            <p className="text-sm text-green-700">Espacio asignado</p>
            <p className="text-4xl font-bold text-green-800">{result.spaceNumber}</p>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            <span className="font-mono font-bold tracking-wider">{result.vehiclePlate}</span> ·{' '}
            {VEHICLE_LABEL[result.vehicle.vehicleType] ?? result.vehicle.vehicleType}
          </p>
          {!!result.services?.length && (
            <div className="mt-4 rounded-xl bg-blue-50 p-3 text-left">
              <p className="mb-1 text-sm font-semibold text-blue-800">Servicios solicitados</p>
              <ul className="list-disc pl-5 text-sm text-blue-700">
                {result.services.map((s) => (
                  <li key={s.key}>{s.name}</li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" onClick={() => navigate('/client')} className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700">
            Ir al inicio
          </button>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="rounded-3xl bg-white p-6 text-center shadow-xl">
          <AlertTriangle size={44} className="mx-auto mb-3 text-amber-500" aria-hidden="true" />
          <p className="text-gray-700">{error.message}</p>
          <button
            type="button"
            onClick={() => (error.vehicleRequired ? navigate('/client/profile?tab=vehicles') : window.location.reload())}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
          >
            {error.vehicleRequired ? 'Registrar mi vehículo' : 'Reintentar'}
          </button>
        </div>
      </Shell>
    );
  }

  if (!options) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white py-12 text-gray-500 shadow-xl">
          <Loader2 className="animate-spin" size={32} aria-hidden="true" />
          <p>Cargando tus vehículos…</p>
        </div>
      </Shell>
    );
  }

  const selected = options.vehicles.find((v) => v.id === selectedId) ?? null;
  const single = options.vehicles.length === 1;

  return (
    <Shell>
      <header className="text-center">
        <p className="text-sm font-medium text-blue-700">{options.parkingLot.name}</p>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Registrar entrada</h1>
        <p className="mt-1 text-sm text-gray-500">{single ? 'Vas a ingresar con tu vehículo registrado' : 'Elegí con qué vehículo ingresás'}</p>
      </header>

      <div className="rounded-3xl bg-white p-5 shadow-xl sm:p-6">
        <div className="grid gap-2" role="radiogroup" aria-label="Vehículo que ingresa">
          {options.vehicles.map((v) => {
            const Icon = VEHICLE_ICON[v.vehicleType] ?? Car;
            const reason = unavailableReason(v);
            const active = selectedId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!v.available || busy}
                onClick={() => setSelectedId(v.id)}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors disabled:cursor-not-allowed ${
                  active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                } ${!v.available ? 'opacity-60' : ''}`}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-lg font-bold tracking-wider text-gray-900">{v.plate}</span>
                  <span className="block truncate text-sm text-gray-500">
                    {[VEHICLE_LABEL[v.vehicleType] ?? v.vehicleType, v.name, [v.brand, v.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
                  </span>
                  {reason ? (
                    <span className="block text-xs text-red-600">{reason}</span>
                  ) : (
                    v.pricePerHour != null && <span className="block text-xs text-gray-400">{money.format(v.pricePerHour)} por hora</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {services.length > 0 && selected && (
          <div className="mt-5">
            <p className="mb-1 text-sm font-medium text-gray-700">
              Servicios adicionales <span className="font-normal text-gray-400">(opcional)</span>
            </p>
            <p className="mb-3 text-xs text-gray-500">Los incluidos no tienen cargo; los adicionales se suman al total al salir.</p>
            <ServiceCheckboxList options={services} selected={selectedServices} onChange={setSelectedServices} disabled={busy} showDetails />
          </div>
        )}

        {submitError && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="button"
          onClick={() => void confirm()}
          disabled={!selected || busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {busy && <Loader2 size={20} className="animate-spin" aria-hidden="true" />}
          {busy ? 'Registrando…' : 'Confirmar ingreso'}
        </button>
        {!selected && options.vehicles.some((v) => v.available) && (
          <p className="mt-2 text-center text-xs text-gray-500">Elegí un vehículo para continuar.</p>
        )}
        {!options.vehicles.some((v) => v.available) && (
          <p className="mt-2 text-center text-xs text-gray-500">Ninguno de tus vehículos puede ingresar ahora. Acercate al personal.</p>
        )}
      </div>

      <p className="text-center text-xs text-gray-500">
        El tiempo empieza a contar al confirmar. ¿Falta un vehículo?{' '}
        <button type="button" onClick={() => navigate('/client/profile?tab=vehicles')} className="font-medium text-blue-600 hover:underline">
          Agregalo en tu perfil
        </button>
      </p>
    </Shell>
  );
}

export default QrCheckInFlow;
