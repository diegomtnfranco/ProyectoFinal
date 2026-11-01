import { OCCUPANCY_COOLDOWN_MINUTES } from './user-notifications.constants';
import type { AvailabilityState } from './entities/parking-availability-state.entity';

export interface MachineState {
  state: AvailabilityState;
  fullSince: Date | null;
  lastNotifiedAt: Date | null;
}

export interface TransitionResult {
  next: MachineState;
  /** null = no hay transición COMPLETO → DISPONIBLE */
  release: null | {
    /** true si el cooldown del estacionamiento se cumplió (o nunca se notificó) */
    lotEligible: boolean;
    /** Identifica el ciclo (inicio del período completo) para la idempotencia */
    cycleStartedAt: Date;
  };
}

/**
 * Máquina de estados de ocupación (pura, sin base de datos).
 * - DISPONIBLE → COMPLETO: arranca el cooldown (fullSince = ahora).
 * - COMPLETO → DISPONIBLE: única transición que puede notificar; el estacionamiento
 *   es elegible si nunca notificó o si estuvo completo >= 10 min seguidos.
 *   Si se libera antes, no se notifica y el ciclo se reinicia al volver a completarse.
 * - Cualquier otro cambio de ocupación no notifica.
 */
export function decideTransition(
  current: MachineState | null,
  available: number,
  total: number,
  now: Date,
): TransitionResult {
  if (total <= 0) {
    return {
      next: current ?? {
        state: 'available',
        fullSince: null,
        lastNotifiedAt: null,
      },
      release: null,
    };
  }
  const isFull = available <= 0;

  if (!current) {
    return {
      next: {
        state: isFull ? 'full' : 'available',
        fullSince: isFull ? now : null,
        lastNotifiedAt: null,
      },
      release: null,
    };
  }
  if (isFull) {
    if (current.state === 'full') return { next: current, release: null };
    return {
      next: { ...current, state: 'full', fullSince: now },
      release: null,
    };
  }
  if (current.state === 'available') return { next: current, release: null };

  const fullSince = current.fullSince ?? now;
  const cooldownMs = OCCUPANCY_COOLDOWN_MINUTES * 60_000;
  const lotEligible =
    !current.lastNotifiedAt ||
    now.getTime() - fullSince.getTime() >= cooldownMs;
  return {
    next: { ...current, state: 'available' },
    release: { lotEligible, cycleStartedAt: fullSince },
  };
}

/** Un suscriptor recibe la liberación si el estacionamiento es elegible o si su alerta es posterior a la última notificación */
export function isSubscriberEligible(
  lotEligible: boolean,
  lastLotNotification: Date | null,
  activatedAt: Date,
): boolean {
  return (
    lotEligible ||
    !lastLotNotification ||
    activatedAt.getTime() > lastLotNotification.getTime()
  );
}
