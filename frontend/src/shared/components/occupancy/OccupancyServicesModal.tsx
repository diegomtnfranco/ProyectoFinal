import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Save, Wrench, X } from 'lucide-react';
import { occupancyServicesService } from '../../../services/occupancy-services.service';
import { toErrorMessage } from '../../../services/parking-profile.service';
import { useToast } from '../../hooks/useToast';
import ServiceCheckboxList, { type ServiceOption } from './ServiceCheckboxList';
import type { OccupancyServices, ServiceExecutionStatus } from '../../../types/occupancy-services.types';

const STATUS_OPTIONS: { value: ServiceExecutionStatus; label: string }[] = [
  { value: 'selected', label: 'Solicitado' },
  { value: 'performed', label: 'Realizado' },
  { value: 'not_performed', label: 'No realizado (sin cargo)' },
];

interface OccupancyServicesModalProps {
  isOpen: boolean;
  spaceId: string;
  onClose: () => void;
}

/** Edición de los servicios solicitados por el vehículo estacionado en un espacio */
export function OccupancyServicesModal({ isOpen, spaceId, onClose }: OccupancyServicesModalProps) {
  const { showSuccess, showError } = useToast();
  const [data, setData] = useState<OccupancyServices | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    occupancyServicesService
      .getForSpace(spaceId)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setSelected(res.selected.map((s) => s.key));
        setLoadError(null);
      })
      .catch((err) => !cancelled && setLoadError(toErrorMessage(err, 'No se pudieron cargar los servicios')));
    return () => {
      cancelled = true;
    };
  }, [isOpen, spaceId]);

  const options: ServiceOption[] = useMemo(() => {
    if (!data) return [];
    const offeredKeys = new Set(data.offered.map((o) => o.key));
    return [
      ...data.offered.map((o) => ({ key: o.key, name: o.name, pricing: o.pricing })),
      // Seleccionados que el dueño desactivó después: se muestran para poder quitarlos
      ...data.selected.filter((s) => !offeredKeys.has(s.key)).map((s) => ({ key: s.key, name: s.name, pricing: s.pricing, noLongerOffered: true })),
    ];
  }, [data]);

  if (!isOpen) return null;

  const original = (data?.selected.map((s) => s.key) ?? []).slice().sort().join('|');
  const isDirty = selected.slice().sort().join('|') !== original;

  const handleSave = async () => {
    if (!data || saving) return;
    setSaving(true);
    try {
      const res = await occupancyServicesService.updateForOccupancy(data.occupancyId, selected);
      setData(res);
      setSelected(res.selected.map((s) => s.key));
      showSuccess('Servicios actualizados');
      onClose();
    } catch (err) {
      showError(toErrorMessage(err, 'No se pudieron guardar los servicios'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (key: string, status: ServiceExecutionStatus) => {
    if (!data || statusSaving) return;
    setStatusSaving(key);
    try {
      const res = await occupancyServicesService.setServiceStatus(data.occupancyId, key, status);
      setData(res);
      showSuccess('Estado del servicio actualizado');
    } catch (err) {
      showError(toErrorMessage(err, 'No se pudo actualizar el estado'));
    } finally {
      setStatusSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Wrench size={20} /> Servicios solicitados
            </h2>
            {data && (
              <p className="text-sm text-gray-500">
                {data.vehiclePlate} · Espacio {data.spaceNumber}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {loadError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
        {!data && !loadError && (
          <p className="flex items-center gap-2 text-gray-500">
            <LoaderCircle size={16} className="animate-spin" /> Cargando…
          </p>
        )}

        {data && options.length === 0 && <p className="text-sm text-gray-500">Este estacionamiento no tiene servicios habilitados.</p>}
        {data && options.length > 0 && (
          <>
            <ServiceCheckboxList options={options} selected={selected} onChange={setSelected} disabled={saving} />
            <p className="mt-3 text-xs text-gray-500">
              Los cambios afectan solo a este vehículo. El precio de cada servicio queda fijado al seleccionarlo.
            </p>
          </>
        )}

        {data && data.selected.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">Realización de servicios guardados</p>
            <p className="mb-2 text-xs text-gray-500">Se cobra lo solicitado salvo que lo marques como no realizado.</p>
            <ul className="space-y-2">
              {data.selected.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-800">{s.name}</span>
                  <select
                    value={s.status}
                    disabled={statusSaving !== null}
                    onChange={(e) => handleStatus(s.key, e.target.value as ServiceExecutionStatus)}
                    aria-label={`Estado de ${s.name}`}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!data || !isDirty || saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
