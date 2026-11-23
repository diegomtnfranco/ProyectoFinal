import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Cámara + detección de QR para el lector del cliente.
 *
 * - Pide la cámara solo cuando se llama a start() (nunca al montar).
 * - Prioriza la cámara trasera (facingMode "environment") y, si el navegador
 *   no la puede elegir, usa la que haya.
 * - Usa BarcodeDetector nativo cuando existe (Chrome Android) y, si no,
 *   jsQR sobre un canvas (Safari iOS). jsQR se carga solo al usarlo.
 * - Al detectar un código se pausa la lectura antes de avisar, así el mismo
 *   código no se procesa dos veces.
 * - stop() detiene el loop y todos los tracks; se llama también al desmontar
 *   y cuando la pestaña pasa a segundo plano.
 * No guarda imágenes ni envía video a ningún lado.
 */
export type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'paused' | 'error';
export type CameraErrorCode = 'insecure' | 'unsupported' | 'blocked' | 'denied' | 'not-found' | 'in-use' | 'failed';

type Decoder = (video: HTMLVideoElement) => Promise<string | null>;

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}
interface BarcodeDetectorCtor {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

const SCAN_INTERVAL_MS = 150;
const MAX_DECODE_WIDTH = 640;
const SAME_CODE_COOLDOWN_MS = 2500;

function mapCameraError(error: unknown): CameraErrorCode {
  const name = (error as { name?: string } | null)?.name ?? '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'not-found';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'in-use';
    default:
      return 'failed';
  }
}

async function isCameraBlocked(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: 'camera' as PermissionName });
    return status?.state === 'denied';
  } catch {
    return false; // el navegador no informa el permiso de cámara: se pide igual
  }
}

async function requestStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (error) {
    // Si el navegador no acepta las restricciones, se usa cualquier cámara disponible
    const name = (error as { name?: string } | null)?.name;
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
      return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    }
    throw error;
  }
}

async function createDecoder(): Promise<Decoder> {
  const Native = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (Native) {
    try {
      const formats = (await Native.getSupportedFormats?.()) ?? [];
      if (formats.includes('qr_code')) {
        const detector = new Native({ formats: ['qr_code'] });
        return async (video) => {
          const codes = await detector.detect(video);
          return codes[0]?.rawValue ?? null;
        };
      }
    } catch {
      /* se usa jsQR */
    }
  }

  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas-unavailable');
  return async (video) => {
    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) return null;
    const scale = Math.min(1, MAX_DECODE_WIDTH / videoWidth);
    const width = Math.round(videoWidth * scale);
    const height = Math.round(videoHeight * scale);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);
    const image = ctx.getImageData(0, 0, width, height);
    return jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
  };
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * onDetect devuelve true si el código se aceptó: el hook apaga la cámara.
 * Si devuelve false la lectura queda en pausa hasta resume().
 */
export function useQrScanner(onDetect: (text: string) => boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const decoderRef = useRef<Decoder | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockedRef = useRef(false); // true desde que se detecta un código hasta resume()
  const sessionRef = useRef(0); // invalida inicios/loops viejos después de stop()
  const ignoreRef = useRef<{ text: string; until: number } | null>(null);
  const onDetectRef = useRef(onDetect);

  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [error, setError] = useState<CameraErrorCode | null>(null);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  const releaseCamera = useCallback(() => {
    sessionRef.current += 1;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    lockedRef.current = false;
    ignoreRef.current = null;
  }, []);

  const loop = useCallback((session: number) => {
    let lastRun = 0;
    let busy = false;
    const tick = (now: number) => {
      if (session !== sessionRef.current || lockedRef.current) return;
      rafRef.current = requestAnimationFrame(tick);
      const video = videoRef.current;
      const decode = decoderRef.current;
      if (busy || !video || !decode || now - lastRun < SCAN_INTERVAL_MS) return;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      lastRun = now;
      busy = true;
      decode(video)
        .then((text) => {
          if (!text || session !== sessionRef.current || lockedRef.current) return;
          const ignored = ignoreRef.current;
          if (ignored && ignored.text === text && Date.now() < ignored.until) return;
          lockedRef.current = true; // pausa antes de avisar: una sola lectura
          if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          setStatus('paused');
          if (onDetectRef.current(text)) {
            releaseCamera();
            setStatus('idle');
          }
        })
        .catch(() => {
          /* cuadro ilegible: se intenta con el siguiente */
        })
        .finally(() => {
          busy = false;
        });
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [releaseCamera]);

  const fail = useCallback(
    (code: CameraErrorCode) => {
      releaseCamera();
      setError(code);
      setStatus('error');
    },
    [releaseCamera],
  );

  const start = useCallback(async () => {
    releaseCamera();
    const session = sessionRef.current;
    setError(null);

    if (!window.isSecureContext) return fail('insecure');
    if (!navigator.mediaDevices?.getUserMedia) return fail('unsupported');

    setStatus('starting');
    const blocked = await isCameraBlocked();
    if (session !== sessionRef.current) return;
    if (blocked) return fail('blocked');

    let stream: MediaStream;
    try {
      stream = await requestStream();
    } catch (e) {
      if (session === sessionRef.current) fail(mapCameraError(e));
      return;
    }
    // Se cerró el lector mientras el navegador pedía el permiso
    if (session !== sessionRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;

    try {
      if (!decoderRef.current) decoderRef.current = await createDecoder();
      if (!videoRef.current) await nextFrame();
      const video = videoRef.current;
      if (session !== sessionRef.current) return;
      if (!video) return fail('failed');
      video.srcObject = stream;
      await video.play();
    } catch (e) {
      if (session === sessionRef.current) fail(mapCameraError(e));
      return;
    }
    if (session !== sessionRef.current) return;
    setStatus('scanning');
    loop(session);
  }, [fail, loop, releaseCamera]);

  const stop = useCallback(() => {
    releaseCamera();
    setError(null);
    setStatus('idle');
  }, [releaseCamera]);

  /** Retoma la lectura después de un código rechazado, ignorándolo unos segundos */
  const resume = useCallback(
    (rejectedText?: string) => {
      if (!streamRef.current) return;
      ignoreRef.current = rejectedText ? { text: rejectedText, until: Date.now() + SAME_CODE_COOLDOWN_MS } : null;
      lockedRef.current = false;
      setStatus('scanning');
      loop(sessionRef.current);
    },
    [loop],
  );

  // La cámara no sigue activa en segundo plano ni después de desmontar
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && streamRef.current) stop();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', stop);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', stop);
      releaseCamera();
    };
  }, [releaseCamera, stop]);

  return { videoRef, status, error, start, stop, resume };
}
