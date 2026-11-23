import type { ChargeBreakdown } from '../../../types/occupancy-services.types';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });

/** Desglose informado por el backend (no recalcula nada en el frontend) */
function ChargeBreakdownView({ breakdown }: { breakdown: ChargeBreakdown }) {
  const rows: [string, string][] = [];
  if (breakdown.parkingSource === 'reservation') {
    rows.push(['Estacionamiento (reserva)', money.format(breakdown.parkingAmount)]);
  } else {
    if (breakdown.hourlyHours > 0 || breakdown.nights === 0) {
      rows.push([`${breakdown.hourlyHours} h × ${money.format(breakdown.pricePerHour)}`, money.format(breakdown.hourlyAmount)]);
    }
    if (breakdown.nights > 0) {
      rows.push([
        `${breakdown.nights} noche${breakdown.nights > 1 ? 's' : ''} × ${money.format(breakdown.nightAmountPerNight ?? 0)}`,
        money.format(breakdown.nightAmount),
      ]);
    }
  }
  for (const s of breakdown.services) {
    const label = s.unitPrice != null && s.quantity > 1 ? `${s.name} (${s.quantity} × ${money.format(s.unitPrice)})` : s.name;
    const value =
      s.status === 'not_performed'
        ? 'No realizado'
        : s.subtotal > 0
          ? money.format(s.subtotal)
          : s.pricingType === 'included'
            ? 'Incluido'
            : 'Gratis';
    rows.push([label, value]);
  }

  return (
    <div className="text-left text-sm">
      <ul className="space-y-1">
        {rows.map(([label, value], i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="text-gray-600">{label}</span>
            <span className="font-medium text-gray-800">{value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between border-t pt-2 font-bold">
        <span>Total</span>
        <span>{money.format(breakdown.total)}</span>
      </p>
    </div>
  );
}

export default ChargeBreakdownView;
