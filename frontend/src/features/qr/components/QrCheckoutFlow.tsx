import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Banknote,
  Car,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Hourglass,
  Loader2,
  LogIn,
  MapPin,
  Wallet as WalletIcon,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useWebsocketStore } from '../../../stores/websocketStore';
import { UserRole } from '../../../types/auth.types';
import { checkoutService } from '../../../services/checkout.service';
import { newIdempotencyKey } from '../../../services/payments.service';
import { PaymentApiError } from '../../../types/payments.types';
import {
  CHECKOUT_EVENTS,
  type CashRequestDetail,
  type CheckoutMatch,
  type QrCheckoutQuote,
  type WalletCheckoutResult,
} from '../../../types/checkout.types';
import { formatCents, formatDateTime } from '../../../shared/components/payments/payment.utils';
import ChargeBreakdownView from '../../../shared/components/occupancy/ChargeBreakdownView';
import { generateTicketPDF } from '../../../shared/utils/GenerateTicketPDF';
import { rememberQrReturn } from '../qrReturn';

const VEHICLE_LABEL: Record<string, string> = {
  car: 'Auto',
  motorcycle: 'Moto',
  truck: 'Camioneta',
  van: 'Camioneta',
};

const POLL_MS = 10_000;

type Screen =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; vehicleRequired?: boolean }
  | { kind: 'ready' }
  | { kind: 'paid'; result: WalletCheckoutResult; match: CheckoutMatch }
  | { kind: 'waiting'; requestId: string }
  | { kind: 'resolved'; detail: CashRequestDetail };

const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : typeof e === 'string' ? e : fallback);

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-md space-y-4">{children}</div>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-5 shadow-lg sm:p-6 ${className}`}>{children}</div>;
}

function stayDuration(checkIn: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(checkIn).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Salida por QR (cliente autenticado). El backend identifica el vehículo con
 * las patentes del perfil, calcula el importe y confirma cada pago: el
 * frontend nunca decide si un pago fue exitoso.
 */
function QrCheckoutFlow({ token }: { token: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const authToken = useAuthStore((s) => s.token);
  const connect = useWebsocketStore((s) => s.connect);
  const socket = useWebsocketStore((s) => s.socket);

  const [screen, setScreen] = useState<Screen>({ kind: 'loading' });
  const [quote, setQuote] = useState<QrCheckoutQuote | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'wallet' | 'cash' | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const idemKey = useRef(newIdempotencyKey());

  const isClient = user?.role === UserRole.CLIENT;
  const returnPath = `${location.pathname}${location.search}`;

  const applyQuote = useCallback((q: QrCheckoutQuote) => {
    setQuote(q);
    setSelectedId((prev) =>
      prev && q.matches.some((m) => m.occupancyId === prev) ? prev : q.matches.length === 1 ? q.matches[0].occupancyId : null,
    );
    // Si ya hay una solicitud de efectivo pendiente, se retoma la espera
    const pending = q.matches.length === 1 ? q.matches[0].cashRequest : null;
    if (pending?.status === 'PENDING' && pending.mine) setScreen({ kind: 'waiting', requestId: pending.id });
    else setScreen({ kind: 'ready' });
  }, []);

  const applyQuoteError = useCallback(
    (e: unknown) => {
      if (e instanceof PaymentApiError && e.code === 'VEHICLE_REQUIRED') {
        rememberQrReturn(returnPath);
        setScreen({ kind: 'error', message: 'Registrá al menos un vehículo en tu perfil para salir con el QR.', vehicleRequired: true });
      } else {
        setScreen({ kind: 'error', message: errorText(e, 'No pudimos leer el QR. Probá de nuevo.') });
      }
    },
    [returnPath],
  );

  const loadQuote = useCallback(
    () => checkoutService.quote(token).then(applyQuote, applyQuoteError),
    [token, applyQuote, applyQuoteError],
  );

  useEffect(() => {
    if (!isClient || !authToken) return;
    connect(authToken);
    checkoutService.quote(token).then(applyQuote, applyQuoteError);
  }, [isClient, authToken, connect, token, applyQuote, applyQuoteError]);

  const retry = () => {
    setScreen({ kind: 'loading' });
    void loadQuote();
  };

  const match = useMemo(() => quote?.matches.find((m) => m.occupancyId === selectedId) ?? null, [quote, selectedId]);

  // ------------------------------------------------------------------ espera de efectivo
  const waitingId = screen.kind === 'waiting' ? screen.requestId : null;
  const refreshRequest = useCallback(async (id: string) => {
    try {
      const detail = await checkoutService.getRequest(id);
      if (detail.status === 'PENDING') return;
      if (detail.status === 'CANCELLED') {
        setNotice('La solicitud de pago en efectivo se canceló.');
        void loadQuote();
        return;
      }
      setScreen({ kind: 'resolved', detail });
    } catch {
      /* se reintenta en el próximo ciclo */
    }
  }, [loadQuote]);

  useEffect(() => {
    if (!waitingId) return;
    const timer = window.setInterval(() => void refreshRequest(waitingId), POLL_MS);
    const onStatus = (data: { requestId?: string }) => {
      if (data?.requestId === waitingId) void refreshRequest(waitingId);
    };
    // Al reconectar se consulta el estado por si se perdió algún evento
    const onReconnect = () => void refreshRequest(waitingId);
    socket?.on(CHECKOUT_EVENTS.STATUS, onStatus);
    socket?.on('connect', onReconnect);
    return () => {
      window.clearInterval(timer);
      socket?.off(CHECKOUT_EVENTS.STATUS, onStatus);
      socket?.off('connect', onReconnect);
    };
  }, [waitingId, socket, refreshRequest]);

  // ------------------------------------------------------------------ acciones
  const payWithWallet = async () => {
    if (!match || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await checkoutService.payWithWallet(token, match.occupancyId, match.amountCents, idemKey.current);
      setScreen({ kind: 'paid', result, match });
    } catch (e) {
      idemKey.current = newIdempotencyKey();
      if (e instanceof PaymentApiError && e.code === 'AMOUNT_CHANGED') {
        setNotice(`El importe se actualizó a ${formatCents(Number(e.data.amountCents))}. Revisalo y confirmá nuevamente.`);
        await loadQuote();
      } else if (e instanceof PaymentApiError && e.code === 'INSUFFICIENT_FUNDS') {
        setNotice('Tu saldo ya no alcanza para este pago. Podés pagar en efectivo.');
        await loadQuote();
      } else if (e instanceof PaymentApiError && e.code === 'ALREADY_CHECKED_OUT') {
        setNotice('Este vehículo ya registró su salida.');
        await loadQuote();
      } else {
        setNotice(errorText(e, 'No se pudo completar el pago. No se realizó ningún cobro.'));
      }
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const requestCash = async () => {
    if (!match || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const request = await checkoutService.requestCash(token, match.occupancyId);
      setScreen({ kind: 'waiting', requestId: request.id });
    } catch (e) {
      if (e instanceof PaymentApiError && e.code === 'CASH_REQUEST_EXISTS' && typeof e.data.requestId === 'string') {
        setScreen({ kind: 'waiting', requestId: e.data.requestId });
      } else {
        setNotice(errorText(e, 'No se pudo enviar la solicitud.'));
        await loadQuote();
      }
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const cancelCash = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await checkoutService.cancelRequest(id);
      setNotice('Cancelaste la solicitud de pago en efectivo.');
      await loadQuote();
    } catch (e) {
      setNotice(errorText(e, 'No se pudo cancelar la solicitud.'));
      void refreshRequest(id);
    } finally {
      setBusy(false);
    }
  };

  const downloadTicket = (result: WalletCheckoutResult, m: CheckoutMatch) => {
    generateTicketPDF({
      ticketNumber: Date.now().toString(),
      parkingLot: { name: quote?.parkingLot.name ?? 'EstacionApp', address: quote?.parkingLot.address ?? '' },
      vehiclePlate: m.vehiclePlate,
      vehicleType: m.vehicleType,
      checkInTime: formatDateTime(m.checkInTime),
      checkOutTime: formatDateTime(result.checkOutTime),
      duration: `${m.hoursToCharge} horas`,
      pricePerHour: m.breakdown?.pricePerHour,
      totalAmount: m.billedAmountCents / 100,
      breakdown: m.breakdown ?? undefined,
    });
  };

  // ================================================================== pantallas

  if (!user || !authToken) {
    return (
      <Shell>
        <Card className="text-center">
          <LogIn size={44} className="mx-auto mb-3 text-blue-600" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-gray-900">Registrar salida</h1>
          <p className="mt-2 text-gray-600">Iniciá sesión con tu cuenta de cliente para identificar tu vehículo y pagar tu estadía.</p>
          <button
            type="button"
            onClick={() => {
              rememberQrReturn(returnPath);
              navigate('/login');
            }}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Iniciar sesión
          </button>
          <p className="mt-4 text-xs text-gray-500">¿No tenés cuenta? Acercate al personal del estacionamiento para registrar tu salida.</p>
        </Card>
      </Shell>
    );
  }

  if (!isClient) {
    return (
      <Shell>
        <Card className="text-center">
          <XCircle size={44} className="mx-auto mb-3 text-amber-500" aria-hidden="true" />
          <h1 className="text-xl font-bold text-gray-900">QR para clientes</h1>
          <p className="mt-2 text-gray-600">Este QR lo usan los clientes para salir. Registrá los egresos desde tu panel.</p>
          <button type="button" onClick={() => navigate('/')} className="mt-6 w-full rounded-xl bg-gray-200 py-3 font-semibold text-gray-700 hover:bg-gray-300">
            Volver al inicio
          </button>
        </Card>
      </Shell>
    );
  }

  if (screen.kind === 'loading') {
    return (
      <Shell>
        <Card className="flex flex-col items-center gap-3 py-12 text-gray-500">
          <Loader2 className="animate-spin" size={32} aria-hidden="true" />
          <p>Buscando tu vehículo…</p>
        </Card>
      </Shell>
    );
  }

  if (screen.kind === 'error') {
    return (
      <Shell>
        <Card className="text-center">
          <AlertTriangle size={44} className="mx-auto mb-3 text-amber-500" aria-hidden="true" />
          <p className="text-gray-700">{screen.message}</p>
          {screen.vehicleRequired ? (
            <button
              type="button"
              onClick={() => navigate('/client/profile?tab=vehicles')}
              className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Registrar mi vehículo
            </button>
          ) : (
            <button type="button" onClick={retry} className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700">
              Reintentar
            </button>
          )}
        </Card>
      </Shell>
    );
  }

  if (screen.kind === 'paid') {
    const { result, match: m } = screen;
    return (
      <Shell>
        <Card className="text-center">
          <CheckCircle2 size={56} className="mx-auto mb-3 text-emerald-500" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-gray-900">{result.status === 'COVERED' ? '¡Salida registrada!' : '¡Pago aprobado!'}</h1>
          <p className="mt-1 text-gray-600">
            {result.status === 'COVERED' ? 'Tu estadía ya estaba cubierta por la reserva.' : 'Tu salida quedó registrada. ¡Buen viaje!'}
          </p>
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs text-emerald-700">Pagado con tu billetera</p>
            <p className="text-3xl font-bold text-emerald-900">{formatCents(result.amountCents)}</p>
            <p className="mt-1 text-xs text-emerald-700">Saldo restante: {formatCents(result.walletBalanceCents)}</p>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            <span className="font-mono font-bold tracking-wider">{m.vehiclePlate}</span> · Espacio {m.space.spaceNumber}
          </p>
          <div className="mt-6 grid gap-2">
            <button
              type="button"
              onClick={() => downloadTicket(result, m)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Download size={18} aria-hidden="true" /> Descargar ticket
            </button>
            <button type="button" onClick={() => navigate('/client')} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700">
              Ir al inicio
            </button>
          </div>
        </Card>
      </Shell>
    );
  }

  if (screen.kind === 'waiting') {
    const pending = quote?.matches.find((x) => x.cashRequest?.id === screen.requestId) ?? match;
    return (
      <Shell>
        <Card className="text-center" >
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Hourglass size={30} className="text-amber-600" aria-hidden="true" />
          </div>
          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800" role="status" aria-live="polite">
            Pago pendiente
          </span>
          <h1 className="mt-3 text-xl font-bold text-gray-900">Esperando la confirmación del personal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Tu solicitud de pago en efectivo fue enviada. Acercate al personal del estacionamiento para realizar el pago y confirmar tu
            salida. El personal podrá registrar tu egreso.
          </p>
          {pending && (
            <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-left text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold tracking-wider">{pending.vehiclePlate}</span>
                <span className="text-gray-500">Espacio {pending.space.spaceNumber}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-gray-500">A pagar (estimado)</span>
                <span className="text-xl font-bold text-gray-900">{formatCents(pending.amountCents)}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">El importe final se calcula cuando el personal registra tu salida.</p>
            </div>
          )}
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Esta pantalla se actualiza sola
          </p>
          <button
            type="button"
            onClick={() => void cancelCash(screen.requestId)}
            disabled={busy}
            className="mt-4 text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline disabled:opacity-50"
          >
            Cancelar solicitud
          </button>
        </Card>
      </Shell>
    );
  }

  if (screen.kind === 'resolved') {
    const d = screen.detail;
    const paid = d.status === 'COMPLETED_PAID' || d.status === 'COMPLETED_WALLET';
    return (
      <Shell>
        <Card className="text-center">
          {paid ? (
            <CheckCircle2 size={56} className="mx-auto mb-3 text-emerald-500" aria-hidden="true" />
          ) : (
            <AlertTriangle size={56} className="mx-auto mb-3 text-amber-500" aria-hidden="true" />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{paid ? '¡Pago confirmado!' : 'Salida registrada'}</h1>
          <p className="mt-2 text-gray-600">
            {paid
              ? 'El personal confirmó tu pago y registró tu salida. ¡Buen viaje!'
              : 'El personal registró tu salida, pero el pago quedó pendiente.'}
          </p>
          <div className={`mt-5 rounded-2xl p-4 ${paid ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <p className={`text-xs ${paid ? 'text-emerald-700' : 'text-amber-700'}`}>{paid ? 'Importe pagado' : 'Importe pendiente'}</p>
            <p className={`text-3xl font-bold ${paid ? 'text-emerald-900' : 'text-amber-900'}`}>{formatCents(d.finalAmountCents ?? d.quotedAmountCents)}</p>
          </div>
          <div className="mt-6 grid gap-2">
            {!paid && (
              <button
                type="button"
                onClick={() => navigate('/client/wallet?tab=pending')}
                className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Ver pagos pendientes
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/client')}
              className={`w-full rounded-xl py-3 font-semibold ${paid ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Ir al inicio
            </button>
          </div>
        </Card>
      </Shell>
    );
  }

  // ------------------------------------------------------------------ ready
  const q = quote!;
  if (q.matches.length === 0) {
    return (
      <Shell>
        <Card className="text-center">
          <Car size={44} className="mx-auto mb-3 text-gray-400" aria-hidden="true" />
          <h1 className="text-xl font-bold text-gray-900">No encontramos tu vehículo</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ninguna de las patentes de tu perfil tiene un ingreso activo en <strong>{q.parkingLot.name}</strong>. Acercate al personal del
            estacionamiento para registrar tu salida.
          </p>
          <div className="mt-6 grid gap-2">
            <button type="button" onClick={retry} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700">
              Volver a buscar
            </button>
            <button
              type="button"
              onClick={() => navigate('/client/profile?tab=vehicles')}
              className="w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-700 hover:bg-gray-200"
            >
              Revisar mis vehículos
            </button>
          </div>
        </Card>
      </Shell>
    );
  }

  const balance = q.wallet.balanceCents;
  const canWallet = !!match && q.methods.wallet.enabled && balance >= match.amountCents;
  const otherPending = match?.cashRequest?.status === 'PENDING' ? match.cashRequest : null;

  return (
    <Shell>
      <header className="text-center">
        <p className="text-sm font-medium text-emerald-700">{q.parkingLot.name}</p>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Registrar salida</h1>
      </header>

      {notice && (
        <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          {notice}
        </div>
      )}

      {/* Varios vehículos propios estacionados acá (D3): el cliente elige cuál sale */}
      {q.matches.length > 1 && (
        <Card>
          <p className="mb-3 text-sm font-medium text-gray-700">¿Qué vehículo sale?</p>
          <div className="grid gap-2" role="radiogroup" aria-label="Vehículo que sale">
            {q.matches.map((m) => (
              <button
                key={m.occupancyId}
                type="button"
                role="radio"
                aria-checked={selectedId === m.occupancyId}
                onClick={() => {
                  setSelectedId(m.occupancyId);
                  setConfirming(null);
                  setNotice(null);
                }}
                className={`flex items-center justify-between rounded-2xl border-2 p-3 text-left transition-colors ${
                  selectedId === m.occupancyId ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-mono font-bold tracking-wider">{m.vehiclePlate}</span>
                <span className="text-sm text-gray-500">Espacio {m.space.spaceNumber}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {match && (
        <>
          {/* Vehículo identificado */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
                <Car size={24} className="text-emerald-700" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xl font-bold tracking-wider text-gray-900">{match.vehiclePlate}</p>
                <p className="truncate text-sm text-gray-500">
                  {[match.vehicle?.name, [match.vehicle?.brand, match.vehicle?.model].filter(Boolean).join(' '), VEHICLE_LABEL[match.vehicleType] ?? match.vehicleType]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={16} className="text-gray-400" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Espacio</dt>
                  <dd>
                    Espacio {match.space.spaceNumber}
                    {match.space.floor != null && <span className="text-gray-400"> · Piso {match.space.floor}</span>}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={16} className="text-gray-400" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Tiempo de estadía</dt>
                  <dd>{stayDuration(match.checkInTime)}</dd>
                </div>
              </div>
            </dl>
          </Card>

          {/* Importe (fuera de los botones) */}
          <Card className="text-center">
            <p className="text-sm text-gray-500">Total a pagar</p>
            <p className="text-4xl font-bold tracking-tight text-gray-900">{formatCents(match.amountCents)}</p>
            {match.coveredAmountCents > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Total {formatCents(match.billedAmountCents)} · ya pagado con la reserva {formatCents(match.coveredAmountCents)}
              </p>
            )}
            {match.breakdown && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDetail((v) => !v)}
                  aria-expanded={showDetail}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  Ver detalle <ChevronDown size={14} className={`transition-transform ${showDetail ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {showDetail && (
                  <div className="mt-3 rounded-2xl bg-gray-50 p-3 text-left">
                    <ChargeBreakdownView breakdown={match.breakdown} />
                  </div>
                )}
              </>
            )}
          </Card>

          {otherPending ? (
            <Card className="text-center text-sm text-gray-600">
              Ya hay una solicitud de pago en efectivo para este vehículo. Acercate al personal para completar tu salida.
              {otherPending.mine && (
                <button
                  type="button"
                  onClick={() => setScreen({ kind: 'waiting', requestId: otherPending.id })}
                  className="mt-3 w-full rounded-xl bg-amber-100 py-2 font-semibold text-amber-800 hover:bg-amber-200"
                >
                  Ver el estado de mi solicitud
                </button>
              )}
            </Card>
          ) : confirming ? (
            <Card>
              <p className="text-center text-gray-700">
                {confirming === 'wallet' ? (
                  <>
                    Vas a pagar <strong>{formatCents(match.amountCents)}</strong> con tu billetera y registrar la salida.
                  </>
                ) : (
                  <>Vas a pagar en efectivo al personal del estacionamiento. Te vamos a avisar cuando confirmen tu salida.</>
                )}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  disabled={busy}
                  className="rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={() => void (confirming === 'wallet' ? payWithWallet() : requestCash())}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                  {confirming === 'wallet' ? 'Pagar' : 'Enviar solicitud'}
                </button>
              </div>
            </Card>
          ) : (
            <section aria-label="Métodos de pago" className="space-y-2">
              {/* 1. Billetera: única integración funcional en esta feature */}
              <button
                type="button"
                onClick={() => setConfirming('wallet')}
                disabled={!canWallet}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-emerald-500 bg-white p-4 text-left shadow-sm transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:shadow-none"
              >
                <WalletIcon size={24} className={canWallet ? 'text-emerald-600' : 'text-gray-400'} aria-hidden="true" />
                <span className="flex-1">
                  <span className={`block font-semibold ${canWallet ? 'text-gray-900' : 'text-gray-500'}`}>Billetera EstacionApp</span>
                  <span className={`block text-sm ${canWallet ? 'text-gray-500' : 'text-red-600'}`}>Saldo disponible: {formatCents(balance)}</span>
                </span>
              </button>
              {!canWallet && <p className="px-2 text-xs text-gray-500">Tu saldo no alcanza para esta estadía. Podés pagar en efectivo.</p>}

              {/* 2. Mercado Pago: solo visual, deshabilitado (integración en otra feature) */}
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 text-left"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00b1ea] text-[10px] font-bold text-white" aria-hidden="true">
                  MP
                </span>
                <span className="flex-1 font-semibold text-gray-500">Mercado Pago</span>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">Próximamente</span>
              </button>

              {/* 3. Efectivo: siempre habilitado */}
              <button
                type="button"
                onClick={() => setConfirming('cash')}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                <Banknote size={24} className="text-gray-600" aria-hidden="true" />
                <span className="flex-1">
                  <span className="block font-semibold text-gray-900">Pago en efectivo</span>
                  <span className="block text-sm text-gray-500">Pagás al personal del estacionamiento</span>
                </span>
              </button>
            </section>
          )}
        </>
      )}

      {!match && q.matches.length > 1 && <p className="text-center text-sm text-gray-500">Elegí el vehículo que sale para ver el importe.</p>}
    </Shell>
  );
}

export default QrCheckoutFlow;
