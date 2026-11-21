// src/shared/components/occupancy/CheckOutModal.tsx
import { useEffect, useState } from 'react';
import { Banknote, Loader2, X } from 'lucide-react';
import { checkoutService } from '../../../services/checkout.service';
import type { StaffCheckoutQuote } from '../../../types/checkout.types';
import { formatCents } from '../payments/payment.utils';

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** `paymentReceived`: el personal cobró en el lugar (se registra como pago presencial aprobado) */
  onConfirm: (paymentReceived: boolean) => void;
  spaceNumber: string;
  vehiclePlate?: string;
  isLoading?: boolean;
  /** Si se indica, se consulta el importe actual y si hay una solicitud de pago en efectivo */
  spaceId?: string;
}

const VEHICLE_LABEL: Record<string, string> = { car: 'Auto', motorcycle: 'Moto', truck: 'Camioneta', van: 'Camioneta' };

const minutesAgo = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

export function CheckOutModal(props: CheckOutModalProps) {
  if (!props.isOpen) return null;
  // key: cada apertura consulta el importe de nuevo y arranca sin "pago recibido"
  return <CheckOutDialog key={props.spaceId ?? props.spaceNumber} {...props} />;
}

function CheckOutDialog({ onClose, onConfirm, spaceNumber, vehiclePlate, isLoading = false, spaceId }: CheckOutModalProps) {
  const [quote, setQuote] = useState<StaffCheckoutQuote | null>(null);
  const [quoteState, setQuoteState] = useState<'loading' | 'ready' | 'unavailable'>(spaceId ? 'loading' : 'unavailable');
  const [paymentReceived, setPaymentReceived] = useState(false);

  useEffect(() => {
    if (!spaceId) return;
    let alive = true;
    checkoutService
      .staffQuote(spaceId)
      .then((q) => {
        if (!alive) return;
        setQuote(q);
        setQuoteState('ready');
      })
      .catch(() => alive && setQuoteState('unavailable'));
    return () => {
      alive = false;
    };
  }, [spaceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(paymentReceived);
  };

  const cash = quote?.cashRequest?.status === 'PENDING' ? quote.cashRequest : null;
  const amountDue = quote ? quote.amountCents > 0 : true;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="checkout-title" className="text-xl font-bold">
            Registrar salida
          </h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vehículo */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <div>
              <p className="font-mono text-lg font-bold tracking-wider">{quote?.vehiclePlate || vehiclePlate || '—'}</p>
              <p className="text-xs text-gray-500">
                {[quote ? VEHICLE_LABEL[quote.vehicleType] ?? quote.vehicleType : null, quote?.clientName].filter(Boolean).join(' · ') || 'Vehículo'}
              </p>
            </div>
            <span className="text-sm text-gray-500">Espacio {spaceNumber}</span>
          </div>

          {/* Solicitud de efectivo pendiente */}
          {cash && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
              <Banknote size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                El cliente pidió salir pagando en efectivo
                {minutesAgo(cash.createdAt) > 0 ? ` (hace ${minutesAgo(cash.createdAt)} min)` : ''}.
              </span>
            </div>
          )}

          {/* Importe calculado por el backend */}
          {quoteState === 'loading' ? (
            <p className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Calculando importe…
            </p>
          ) : quote ? (
            <div className="text-center">
              <p className="text-sm text-gray-500">{amountDue ? 'Importe a cobrar' : 'Importe'}</p>
              <p className="text-3xl font-bold text-gray-900">{formatCents(quote.amountCents)}</p>
              {quote.coveredAmountCents > 0 && (
                <p className="text-xs text-gray-500">
                  Total {formatCents(quote.billedAmountCents)} · pagado con la reserva {formatCents(quote.coveredAmountCents)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-600">
              ¿Confirmar salida del espacio <strong>{spaceNumber}</strong>
              {vehiclePlate && ` para el vehículo ${vehiclePlate}`}?
            </p>
          )}

          {/* Cobro presencial */}
          {quote && amountDue && (
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors ${paymentReceived ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
              <input
                type="checkbox"
                checked={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.checked)}
                className="h-5 w-5 accent-emerald-600"
              />
              <span className="flex-1">
                <span className="block font-medium text-gray-900">Pago recibido presencialmente</span>
                <span className="block text-xs text-gray-500">
                  {paymentReceived ? 'Se registrará el cobro y la salida.' : 'Sin marcar, la salida queda con el pago pendiente.'}
                </span>
              </span>
            </label>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-300 py-2.5 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || quoteState === 'loading'}
              className="flex-1 rounded-xl bg-blue-500 py-2.5 font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Procesando...' : 'Confirmar egreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
