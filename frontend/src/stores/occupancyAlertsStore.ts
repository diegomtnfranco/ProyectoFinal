import { create } from 'zustand';
import { occupancyAlertsService } from '../services/user-notifications.service';

/**
 * Estado compartido entre tarjetas de las alertas de ocupación del cliente.
 * Independiente del store de autenticación y sin persistencia local:
 * la fuente de verdad es el backend (se vuelve a pedir al cargar).
 */
interface OccupancyAlertsState {
  subscribed: Set<string>;
  loaded: boolean;
  pending: Set<string>;
  load: () => Promise<void>;
  toggle: (parkingLotId: string) => Promise<boolean>;
  reset: () => void;
}

let loading: Promise<void> | null = null;

export const useOccupancyAlertsStore = create<OccupancyAlertsState>((set, get) => ({
  subscribed: new Set(),
  loaded: false,
  pending: new Set(),

  load: async () => {
    if (loading) return loading;
    loading = occupancyAlertsService
      .list()
      .then((subs) => set({ subscribed: new Set(subs.map((s) => s.parkingLotId)), loaded: true }))
      .finally(() => {
        loading = null;
      });
    return loading;
  },

  /** Devuelve el nuevo estado (true = activa). Evita envíos repetidos mientras hay uno en curso. */
  toggle: async (parkingLotId) => {
    const { subscribed, pending } = get();
    if (pending.has(parkingLotId)) return subscribed.has(parkingLotId);
    const activate = !subscribed.has(parkingLotId);
    set({ pending: new Set(pending).add(parkingLotId) });
    try {
      if (activate) await occupancyAlertsService.activate(parkingLotId);
      else await occupancyAlertsService.deactivate(parkingLotId);
      const next = new Set(get().subscribed);
      if (activate) next.add(parkingLotId);
      else next.delete(parkingLotId);
      set({ subscribed: next });
      return activate;
    } finally {
      const p = new Set(get().pending);
      p.delete(parkingLotId);
      set({ pending: p });
    }
  },

  reset: () => set({ subscribed: new Set(), loaded: false, pending: new Set() }),
}));
