import { useEffect, useState } from 'react';
import { CircleAlert, LoaderCircle, Moon, RefreshCw, Save } from 'lucide-react';
import { occupancyServicesService } from '../../../services/occupancy-services.service';
import { toErrorMessage } from '../../../services/parking-profile.service';
import { useToast } from '../../../shared/hooks/useToast';
import { NightRateMode } from '../../../types/occupancy-services.types';
import type { NightPolicy, NightRateModeValue } from '../../../types/occupancy-services.types';

interface NightPolicyCardProps {
  parkingLotId: string;
}

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });

/** Configuración de la tarifa nocturna del estacionamiento seleccionado */
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
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <CircleAlert size={18} className="mb-1 inline" /> {loadError}{' '}
        <button onClick={() => setReloadToken((t) => t + 1)} className="ml-2 inline-flex items-center gap-1 text-blue-600 hover:underline">
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    );
  }
  if (!policy) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-6 text-gray-500">
        <LoaderCircle size={18} className="animate-spin" /> Cargando tarifa nocturna…
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

  const option = (value: NightRateModeValue, title: string, text: string) => (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
        mode === value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
      } ${value === NightRateMode.SPECIAL && policy.isOpen24h ? 'pointer-events-none opacity-50' : ''}`}
    >
      <input
        type="radio"
        name="night-mode"
        className="mt-1"
        checked={mode === value}
        onChange={() => {
          setMode(value);
          setAmountError(null);
        }}
        disabled={saving || (value === NightRateMode.SPECIAL && policy.isOpen24h)}
      />
      <span>
        <span className="block font-medium text-gray-800">{title}</span>
        <span className="block text-sm text-gray-500">{text}</span>
      </span>
    </label>
  );

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Moon size={20} className="text-indigo-600" /> Tarifa nocturna
        </h2>
        <p className="text-sm text-gray-500">
          Horario del estacionamiento: <strong>{policy.openTime} – {policy.closeTime}</strong>. Se considera noche el tramo de cierre a
          reapertura, con {policy.toleranceMinutes} minutos de tolerancia después del cierre.
        </p>
        {policy.isOpen24h && (
          <p className="mt-1 text-sm text-amber-700">El horario figura como abierto las 24 h: no hay período nocturno.</p>
        )}
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {option(NightRateMode.HOURLY, 'Seguir cobrando por hora', 'Las horas después del cierre se siguen cobrando con la tarifa por hora hasta el egreso.')}
        {option(
          NightRateMode.SPECIAL,
          'Tarifa nocturna especial',
          'Cada noche que el vehículo pasa adentro se cobra un importe fijo que reemplaza las horas de cierre a reapertura.',
        )}
      </div>

      {mode === NightRateMode.SPECIAL && (
        <div className="max-w-xs">
          <label htmlFor="night-amount" className="mb-1 block text-sm font-medium text-gray-700">
            Importe por noche (ARS)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
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
              className={`w-full rounded-lg border py-2 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                amountError ? 'border-red-400' : 'border-gray-300'
              }`}
            />
          </div>
          {amountError && <p className="mt-1 text-xs text-red-600">{amountError}</p>}
        </div>
      )}

      <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
        {policy.mode === NightRateMode.SPECIAL && policy.nightAmount != null
          ? `Vigente: tarifa nocturna especial de ${money.format(policy.nightAmount)} por noche. Las horas fuera de la noche se cobran por hora y los servicios adicionales se suman aparte.`
          : 'Vigente: se cobra por hora también después del cierre.'}{' '}
        Los cambios aplican a los vehículos que ingresen después de guardar; los que ya están adentro conservan la regla con la que ingresaron.
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Guardando…' : 'Guardar tarifa nocturna'}
        </button>
      </div>
    </section>
  );
}

export default NightPolicyCard;
