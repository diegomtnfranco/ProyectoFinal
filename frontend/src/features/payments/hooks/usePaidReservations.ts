import { useEffect, useState } from 'react';
import { paymentsService } from '../../../services/payments.service';

/** Ids de reservas con pago aprobado (una sola consulta para toda la lista) */
export function usePaidReservations() {
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    paymentsService
      .listMine(1, 100)
      .then((page) => {
        if (!alive) return;
        setPaidIds(
          new Set(
            page.items
              .filter((p) => p.status === 'APPROVED' && p.obligationType === 'RESERVATION' && p.reservationId)
              .map((p) => p.reservationId as string),
          ),
        );
      })
      .catch(() => {
        // Sin datos de pago la lista de reservas se muestra igual
      });
    return () => {
      alive = false;
    };
  }, [version]);

  return { paidIds, refresh: () => setVersion((v) => v + 1) };
}
