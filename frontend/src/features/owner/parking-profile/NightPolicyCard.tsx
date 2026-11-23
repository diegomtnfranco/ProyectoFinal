import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { occupancyServicesService } from '../../../services/occupancy-services.service';
import { toErrorMessage } from '../../../services/parking-profile.service';
import { useToast } from '../../../shared/hooks/useToast';
import { NightRateMode } from '../../../types/occupancy-services.types';
import type { NightPolicy, NightRateModeValue } from '../../../types/occupancy-services.types';

interface NightPolicyCardProps {
  parkingLotId: string;
}

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });

/**
 * Configuración de la tarifa nocturna del estacionamiento seleccionado.
 * Se muestra dentro del bloque "Tarifa nocturna" de la página de configuración
 * (el título y el contenedor los pone SettingsSection).
 */
function NightPolicyCard({ parkingLotId }: NightPolicyCardProps) {
  const { showSuccess, showError } = useToast();
  const [policy, setPolicy] = useState<NightPolicy | null>(null);
  const [mode, setMode] = useState<NightRateModeValue>(NightRateMode.HOURLY);
  const [amount, setAmount] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    occupancyServicesService
      .getNightPolicy(parkingLotId)
      .then((p) => {
        if (cancelled) return;
        setPolicy(p);
        setMode(p.mode);
        setAmount(p.nightAmount != null ? String(p.nightAmount) : '');
        setLoadError(null);
      })
      .catch((err) => !cancelled && setLoadError(toErrorMessage(err, 'No se pudo cargar la tarifa nocturna')));
    return () => {
      cancelled = true;
    };
  }, [parkingLotId, reloadToken]);

  if (loadError && !policy) {
    return (
      <div className="text-sm text-gray-900">
        <p className="text-red-700">{loadError}</p>
        <button
          type="button"
          onClick={() => setReloadToken((t) => t + 1)}
          className="mt-2 font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (!policy) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <LoaderCircle size={16} className="animate-spin" /> Cargando tarifa nocturna…
      </div>
    );
  }

  const savedAmount = policy.nightAmount != null ? String(policy.nightAmount) : '';
  const isDirty = mode !== policy.mode || (mode === NightRateMode.SPECIAL && amount.trim() !== savedAmount);

  const validateAmount = (): number | null | 'error' => {
    if (mode !== NightRateMode.SPECIAL) return null;
    const raw = amount.trim().replace(',', '.');
    if (!raw) return (setAmountError('Ingresá el importe nocturno'), 'error');
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) return (setAmountError('Debe ser un número positivo con hasta 2 decimales'), 'error');
    const value = Number(raw);
    if (value <= 0) return (setAmountError('El importe debe ser mayor a 0'), 'error');
    if (value > 99_999_999.99) return (setAmountError('El importe es demasiado alto'), 'error');
    return value;
  };

  const handleSave = async () => {
    if (saving) return;
    setAmountError(null);
    const nightAmount = validateAmount();
    if (nightAmount === 'error') return;
    setSaving(true);
    try {
      const updated = await occupancyServicesService.updateNightPolicy(parkingLotId, {
        mode,
        ...(nightAmount !== null ? { nightAmount } : {}),
      });
      setPolicy(updated);
      setMode(updated.mode);
      setAmount(updated.nightAmount != null ? String(updated.nightAmount) : '');
      showSuccess('Tarifa nocturna guardada');
    } catch (err) {
      showError(toErrorMessage(err, 'No se pudo guardar la tarifa nocturna'));
    } finally {
      setSaving(false);
    }
  };

  const option = (value: NightRateModeValue, title: string, text: string) => {
    const selected = mode === value;
    const blocked = value === NightRateMode.SPECIAL && policy.isOpen24h;
    return (
      <label
        className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
          selected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'
        } ${blocked ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input
          type="radio"
          name="night-mode"
          className="mt-0.5 h-4 w-4 accent-blue-600"
          checked={selected}
          onChange={() => {
            setMode(value);
            setAmountError(null);
          }}
          disabled={saving || blocked}
        />
        <span>
          <span className={`block font-bold ${selected ? 'text-blue-700' : 'text-gray-900'}`}>{title}</span>
          <span className="mt-0.5 block text-sm text-gray-500">{text}</span>
        </span>
      </label>
    );
  };

  const current =
    policy.mode === NightRateMode.SPECIAL && policy.nightAmount != null
      ? `Tarifa nocturna especial de ${money.format(policy.nightAmount)} por noche.`
      : 'Se cobra por hora también después del cierre.';

  return (
    <div className="space-y-7">
      {/* Horario y regla vigente: lo más importante primero */}
      <div className="space-y-1">
        <p className="text-sm text-gray-900">
          Horario: <strong className="font-bold">{policy.openTime} – {policy.closeTime}</strong> · Vigente: <strong className="font-bold">{current}</strong>
        </p>
        <p className="text-xs text-gray-500">
          Se considera noche el tramo de cierre a reapertura, con {policy.toleranceMinutes} minutos de tolerancia después del cierre.
        </p>
        {policy.isOpen24h && (
          <p className="text-sm text-gray-900">El horario figura como abierto las 24 h: no hay período nocturno.</p>
        )}
      </div>

      <div className="grid gap-3 cq-md:grid-cols-2">
        {option(NightRateMode.HOURLY, 'Seguir cobrando por hora', 'Las horas después del cierre se cobran con la tarifa por hora hasta el egreso.')}
        {option(
          NightRateMode.SPECIAL,
          'Tarifa nocturna especial',
          'Cada noche adentro se cobra un importe fijo que reemplaza las horas de cierre a reapertura.',
        )}
      </div>

      {mode === NightRateMode.SPECIAL && (
        <div className="max-w-xs">
          <label htmlFor="night-amount" className="mb-2 block text-base font-bold text-gray-900">
            Importe por noche
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
            <input
              id="night-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setAmountError(null);
              }}
              disabled={saving}
              placeholder="0,00"
              className={`w-full rounded-xl border py-2.5 pl-7 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                amountError ? 'border-red-400' : 'border-gray-300'
              }`}
            />
          </div>
          {amountError && <p className="mt-1 text-xs text-red-600">{amountError}</p>}
        </div>
      )}

      <p className="text-xs text-gray-500">
          Los cambios aplican a los vehículos que ingresen después de guardar; los que ya están adentro conservan la regla con la que ingresaron.
          {policy.mode === NightRateMode.SPECIAL && ' Las horas fuera de la noche se cobran por hora y los servicios adicionales se suman aparte.'}
      </p>

      {/* Barra de guardado: queda fija sobre la pantalla mientras el bloque está a la vista */}
      <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <span className={`mr-auto text-sm ${isDirty ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
          {isDirty ? 'Tenés cambios sin guardar.' : 'Sin cambios.'}
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1"
        >
          {saving && <LoaderCircle size={16} className="animate-spin" />}
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

export default NightPolicyCard;
