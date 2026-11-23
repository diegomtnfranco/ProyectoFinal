import { useCallback, useEffect, useState } from 'react';
import { Banknote } from 'lucide-react';
import { useWebsocketStore } from '../../../stores/websocketStore';
import { useToast } from '../../hooks/useToast';
import { checkoutService } from '../../../services/checkout.service';
import { CHECKOUT_EVENTS, type PendingCashRequest } from '../../../types/checkout.types';
import { formatCents } from './payment.utils';

const minutesAgo = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

/**
 * Dueño/empleado: clientes que pidieron salir pagando en efectivo. Se actualiza
 * en tiempo real; el backend solo envía estos eventos al personal del
 * estacionamiento. El egreso se registra desde el espacio ("Egreso").
 */
function CashRequestsPanel({ parkingLotId }: { parkingLotId: string }) {
  const socket = useWebsocketStore((s) => s.socket);
  const { showInfo } = useToast();
  const [items, setItems] = useState<PendingCashRequest[]>([]);

  const refresh = useCallback(
    () =>
      checkoutService
        .pendingForLot(parkingLotId)
        .then(setItems)
        .catch(() => undefined),
    [parkingLotId],
  );

  useEffect(() => {
    let alive = true;
    checkoutService
      .pendingForLot(parkingLotId)
      .then((list) => alive && setItems(list))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [parkingLotId]);

  useEffect(() => {
    if (!socket) return;
    const onRequested = (data: { parkingLotId?: string; vehiclePlate?: string; spaceNumber?: string }) => {
      if (data?.parkingLotId !== parkingLotId) return;
      showInfo(`${data.vehiclePlate ?? 'Un cliente'} (espacio ${data.spaceNumber ?? '—'}) quiere salir pagando en efectivo`);
      void refresh();
    };
    const onChanged = () => void refresh();
    socket.on(CHECKOUT_EVENTS.CASH_REQUESTED, onRequested);
    socket.on(CHECKOUT_EVENTS.REQUEST_UPDATED, onChanged);
    socket.on('occupancy:update', onChanged);
    socket.on('connect', onChanged);
    return () => {
      socket.off(CHECKOUT_EVENTS.CASH_REQUESTED, onRequested);
      socket.off(CHECKOUT_EVENTS.REQUEST_UPDATED, onChanged);
      socket.off('occupancy:update', onChanged);
      socket.off('connect', onChanged);
    };
  }, [socket, parkingLotId, refresh, showInfo]);

  if (!items.length) return null;

  return (
    <section aria-label="Pagos en efectivo pendientes" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
        <Banknote size={18} aria-hidden="true" />
        {items.length === 1 ? '1 cliente quiere salir pagando en efectivo' : `${items.length} clientes quieren salir pagando en efectivo`}
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
            <div className="min-w-0">
              <p className="font-mono font-bold tracking-wider text-gray-900">{r.vehiclePlate ?? '—'}</p>
              <p className="truncate text-xs text-gray-500">
                Espacio {r.spaceNumber}
                {r.floor != null && ` · Piso ${r.floor}`}
                {r.clientName && ` · ${r.clientName}`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{formatCents(r.quotedAmountCents)}</p>
              <p className="text-xs text-gray-400">{minutesAgo(r.createdAt) ? `hace ${minutesAgo(r.createdAt)} min` : 'recién'}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-amber-800">Cobrá en el lugar y registrá la salida con “Egreso” en el espacio.</p>
    </section>
  );
}

export default CashRequestsPanel;
