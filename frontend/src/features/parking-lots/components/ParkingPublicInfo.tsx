import { useEffect, useState } from 'react';
import { BadgeCheck, Gift, Info, MapPin, Receipt, Ruler, Wrench } from 'lucide-react';
import { parkingProfileService } from '../../../services/parking-profile.service';
import { formatPrice } from '../../../shared/components/parking-profile/pricing';
import { PricingType } from '../../../types/parking-profile.types';
import type { ParkingProfilePublic, PublicService } from '../../../types/parking-profile.types';

interface ParkingPublicInfoProps {
  parkingLotId: string;
}

const GROUPS = [
  { type: PricingType.INCLUDED, title: 'Incluidos en la tarifa', icon: BadgeCheck, tone: 'text-green-700 bg-green-50 border-green-200' },
  { type: PricingType.FREE, title: 'Gratuitos', icon: Gift, tone: 'text-teal-700 bg-teal-50 border-teal-200' },
  { type: PricingType.EXTRA_COST, title: 'Con costo adicional', icon: Receipt, tone: 'text-amber-800 bg-amber-50 border-amber-200' },
] as const;

function ServiceItem({ service }: { service: PublicService }) {
  return (
    <li className="rounded-xl bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-gray-800">{service.name}</span>
        <span className="text-sm font-semibold text-gray-900">{formatPrice(service.pricing)}</span>
      </div>
      {service.description && <p className="mt-1 text-sm text-gray-600">{service.description}</p>}
      {service.conditions && <p className="mt-1 text-xs text-gray-500">Condiciones: {service.conditions}</p>}
    </li>
  );
}

/**
 * Sección informativa (solo lectura) de la página de reservas. Se carga de
 * forma independiente: si falla, no afecta al formulario de reserva.
 */
function ParkingPublicInfo({ parkingLotId }: ParkingPublicInfoProps) {
  const [info, setInfo] = useState<ParkingProfilePublic | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    parkingProfileService
      .getPublic(parkingLotId)
      .then((data) => !cancelled && setInfo(data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [parkingLotId]);

  if (failed) return null;
  if (!info) return <div className="h-24 animate-pulse rounded-2xl bg-gray-100" aria-hidden />;

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-6" aria-labelledby="parking-info-title">
      <h2 id="parking-info-title" className="mb-3 flex items-center gap-2 text-xl font-semibold">
        <Info size={20} className="text-blue-600" /> Sobre este estacionamiento
      </h2>

      <p className="mb-4 flex items-start gap-2 text-sm text-gray-600">
        <MapPin size={16} className="mt-0.5 shrink-0" />
        <span>
          <span className="font-medium text-gray-700">Dirección registrada: </span>
          {info.address}
        </span>
      </p>

      {!info.hasDetails ? (
        <p className="text-sm text-gray-500">Este estacionamiento todavía no publicó detalles adicionales.</p>
      ) : (
        <div className="space-y-5">
          {info.description && <p className="whitespace-pre-line text-gray-700">{info.description}</p>}

          {info.physicalFeatures.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                <Ruler size={15} /> Características informadas
              </h3>
              <ul className="flex flex-wrap gap-2">
                {info.physicalFeatures.map((f) => (
                  <li key={f.code} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-800">
                    {f.name}
                    {f.notes && <span className="text-blue-600/80"> · {f.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {info.services.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                <Wrench size={15} /> Servicios
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                {GROUPS.map((group) => {
                  const items = info.services.filter((s) => s.pricing.type === group.type);
                  if (items.length === 0) return null;
                  const Icon = group.icon;
                  return (
                    <div key={group.type} className={`rounded-2xl border p-3 ${group.tone}`}>
                      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                        <Icon size={16} /> {group.title}
                      </p>
                      <ul className="space-y-2">
                        {items.map((s) => (
                          <ServiceItem key={`${s.source}-${s.key}`} service={s} />
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Precios informados por el estacionamiento. Son de referencia: no se agregan a tu reserva ni se cobran desde la app.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ParkingPublicInfo;
