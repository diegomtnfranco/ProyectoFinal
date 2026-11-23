import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraOff, Loader2, QrCode, ScanQrCode, ShieldAlert, X } from 'lucide-react';
import { useQrScanner, type CameraErrorCode } from '../hooks/useQrScanner';
import { parseEstacionQr } from '../parseEstacionQr';
import { useToast } from '../../../shared/hooks/useToast';

const CAMERA_ERRORS: Record<CameraErrorCode, { title: string; message: string; retry: boolean }> = {
  insecure: {
    title: 'Conexión no segura',
    message: 'El navegador solo permite usar la cámara en sitios seguros (https). Abrí EstacionApp desde su dirección https.',
    retry: false,
  },
  unsupported: {
    title: 'Cámara no disponible',
    message: 'Este navegador no permite usar la cámara. Probá con Chrome en Android o Safari en iPhone.',
    retry: false,
  },
  blocked: {
    title: 'Acceso a la cámara bloqueado',
    message: 'Bloqueaste el acceso a la cámara para EstacionApp. Habilitalo en los permisos del sitio en tu navegador y volvé a intentar.',
    retry: true,
  },
  denied: {
    title: 'Permiso de cámara rechazado',
    message: 'Para escanear el QR necesitás permitir el acceso a la cámara.',
    retry: true,
  },
  'not-found': {
    title: 'No encontramos una cámara',
    message: 'Tu dispositivo no tiene una cámara disponible para escanear.',
    retry: true,
  },
  'in-use': {
    title: 'La cámara está en uso',
    message: 'Otra aplicación está usando la cámara. Cerrala y volvé a intentar.',
    retry: true,
  },
  failed: {
    title: 'No se pudo iniciar la cámara',
    message: 'Ocurrió un problema al encender la cámara. Volvé a intentar.',
    retry: true,
  },
};

const INVALID_QR = {
  'not-estacionapp': 'Este QR no es de EstacionApp. Escaneá el QR de ingreso o salida del estacionamiento.',
  'bad-format': 'El QR de EstacionApp está incompleto o dañado. Probá con otro o pedile ayuda al personal.',
} as const;

/**
 * Lector QR del cliente (solo rol client, ruta /client/scan).
 * Lee el QR de ingreso o salida y continúa con el flujo existente en /scan/:type.
 */
function ClientQrScannerPage() {
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [rejected, setRejected] = useState<{ text: string; message: string } | null>(null);

  const handleDetect = useCallback(
    (text: string) => {
      const parsed = parseEstacionQr(text);
      if (parsed.ok) {
        showSuccess(parsed.type === 'check-in' ? 'QR de ingreso detectado' : 'QR de salida detectado');
        navigate(parsed.path);
        return true;
      }
      setRejected({ text, message: INVALID_QR[parsed.reason] });
      return false;
    },
    [navigate, showSuccess],
  );

  const { videoRef, status, error, start, stop, resume } = useQrScanner(handleDetect);

  const handleStart = () => {
    setRejected(null);
    void start();
  };

  const handleRetryScan = () => {
    const text = rejected?.text;
    setRejected(null);
    resume(text);
  };

  const handleStop = () => {
    setRejected(null);
    stop();
  };

  const handleClose = () => {
    stop();
    navigate('/client');
  };

  const cameraOn = status === 'starting' || status === 'scanning' || status === 'paused';

  if (cameraOn) {
    return (
      <div className="fixed inset-0 z-[1100] bg-black text-white" role="dialog" aria-modal="true" aria-label="Lector de códigos QR">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted autoPlay aria-hidden="true" />

        {/* Marco de lectura */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative aspect-square w-[72vw] max-w-xs rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
            <span className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-3xl border-l-4 border-t-4 border-blue-500" />
            <span className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-3xl border-r-4 border-t-4 border-blue-500" />
            <span className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-3xl border-b-4 border-l-4 border-blue-500" />
            <span className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-3xl border-b-4 border-r-4 border-blue-500" />
            {status === 'scanning' && (
              <span className="absolute inset-x-6 top-1/2 h-0.5 animate-pulse rounded-full bg-blue-400" />
            )}
          </div>
        </div>

        {/* Barra superior */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <p className="text-base font-semibold drop-shadow">Escanear QR</p>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
            aria-label="Cerrar lector"
          >
            <X size={26} />
          </button>
        </div>

        {/* Parte inferior */}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          {status === 'starting' && (
            <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl bg-black/60 px-4 py-4 text-sm">
              <Loader2 size={20} className="animate-spin" /> Encendiendo la cámara…
            </div>
          )}

          {status === 'scanning' && (
            <div className="mx-auto max-w-md space-y-3 text-center">
              <p className="rounded-2xl bg-black/60 px-4 py-3 text-sm">Apuntá al QR de ingreso o salida del estacionamiento</p>
              <button
                type="button"
                onClick={handleStop}
                className="w-full rounded-xl bg-white/90 py-4 text-base font-semibold text-gray-800 hover:bg-white"
              >
                Detener
              </button>
            </div>
          )}

          {status === 'paused' && rejected && (
            <div className="mx-auto max-w-md rounded-3xl bg-white p-5 text-gray-900 shadow-xl" role="alert">
              <div className="mb-4 flex items-start gap-3">
                <ShieldAlert size={28} className="shrink-0 text-red-500" />
                <p className="text-sm text-gray-700">{rejected.message}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleRetryScan}
                  className="w-full rounded-xl bg-blue-600 py-4 text-base font-semibold text-white hover:bg-blue-700"
                >
                  Escanear de nuevo
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-xl bg-gray-200 py-3 font-semibold text-gray-700 hover:bg-gray-300"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {status === 'paused' && !rejected && (
            <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl bg-black/60 px-4 py-4 text-sm">
              <Loader2 size={20} className="animate-spin" /> Abriendo…
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'error' && error) {
    const info = CAMERA_ERRORS[error];
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-6">
        <div className="w-full rounded-3xl bg-white p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <CameraOff size={32} className="text-red-500" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">{info.title}</h1>
          <p className="mb-6 text-gray-600">{info.message}</p>
          <div className="flex flex-col gap-3">
            {info.retry && (
              <button
                type="button"
                onClick={handleStart}
                className="w-full rounded-xl bg-blue-600 py-4 text-base font-semibold text-white hover:bg-blue-700"
              >
                Reintentar
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/client')}
              className="w-full rounded-xl bg-gray-200 py-3 font-semibold text-gray-700 hover:bg-gray-300"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bienvenida: la cámara se pide recién al tocar "Activar cámara"
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-6">
      <div className="w-full rounded-3xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 shadow-lg">
          <QrCode size={40} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Escanear QR</h1>
        <p className="mt-2 text-gray-600">Registrá tu ingreso o salida escaneando el QR del estacionamiento.</p>

        <ol className="mt-5 space-y-3 text-left text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
            Tocá “Activar cámara” y permití el acceso cuando el navegador lo pida.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
            Apuntá al QR de ingreso o salida dentro del marco.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
            Seguí los pasos en pantalla para completar el ingreso o la salida.
          </li>
        </ol>

        <button
          type="button"
          onClick={handleStart}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-base font-semibold text-white hover:bg-blue-700"
        >
          <ScanQrCode size={22} /> Activar cámara
        </button>
        <p className="mt-3 text-xs text-gray-400">Solo usamos la cámara mientras el lector está abierto. No se guardan imágenes.</p>
      </div>
    </div>
  );
}

export default ClientQrScannerPage;
