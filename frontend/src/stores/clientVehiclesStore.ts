import { create } from "zustand";
import { clientVehiclesService } from "../services/client-tracking.service";
import type { ClientVehicle } from "../types/client-tracking.types";

/**
 * Vehículos registrados del cliente, compartidos entre todas las tarjetas del
 * listado (una sola petición para todas). Independiente del store de
 * autenticación y sin persistencia local: la fuente de verdad es
 * GET /client-vehicles/me. Se asocia al id del usuario para no mezclar datos
 * si cambia la sesión.
 *
 * Un error de carga NO se interpreta como "sin vehículos" (status 'error').
 */
export type ClientVehiclesStatus = "idle" | "loading" | "ready" | "error";

interface ClientVehiclesState {
  userId: string | null;
  vehicles: ClientVehicle[];
  status: ClientVehiclesStatus;
  /** Carga una vez por usuario (deduplica pedidos en curso). */
  load: (userId: string) => Promise<void>;
  /** Sincroniza tras alta/edición/baja hecha en "Mi vehículo". */
  setVehicles: (userId: string, vehicles: ClientVehicle[]) => void;
  reset: () => void;
}

let inFlight: { userId: string; promise: Promise<void> } | null = null;

export const useClientVehiclesStore = create<ClientVehiclesState>(
  (set, get) => ({
    userId: null,
    vehicles: [],
    status: "idle",

    load: (userId) => {
      const state = get();
      if (state.userId === userId && state.status === "ready")
        return Promise.resolve();
      if (inFlight && inFlight.userId === userId) return inFlight.promise;

      set({
        userId,
        status: "loading",
        vehicles: state.userId === userId ? state.vehicles : [],
      });
      const promise: Promise<void> = clientVehiclesService
        .list()
        .then((list) => {
          if (get().userId === userId) set({ vehicles: list, status: "ready" });
        })
        .catch(() => {
          if (get().userId === userId) set({ status: "error" });
        })
        .finally(() => {
          if (inFlight?.promise === promise) inFlight = null;
        });
      inFlight = { userId, promise };
      return promise;
    },

    setVehicles: (userId, vehicles) =>
      set({ userId, vehicles, status: "ready" }),

    reset: () => {
      inFlight = null;
      set({ userId: null, vehicles: [], status: "idle" });
    },
  }),
);
