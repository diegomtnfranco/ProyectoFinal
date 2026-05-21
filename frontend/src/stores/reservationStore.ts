// import { create } from 'zustand';
// import reservationService from '../services/reservation.service';
// import { Reservation } from '../types/reservation.types';

// interface ReservationState {
//   reservations: Reservation[];
//   selectedReservation: Reservation | null;
//   isLoading: boolean;
//   loadReservations: () => Promise<void>;
//   loadReservation: (id: string) => Promise<void>;
//   cancelReservation: (id: string) => Promise<void>;
// }

// const useReservationStore = create<ReservationState>((set) => ({
//   reservations: [],
//   selectedReservation: null,
//   isLoading: false,
//   loadReservations: async () => {
//     set({ isLoading: true });
//     try {
//       const reservations = await reservationService.listReservations();
//       set({ reservations });
//     } finally {
//       set({ isLoading: false });
//     }
//   },
//   loadReservation: async (id: string) => {
//     set({ isLoading: true });
//     try {
//       const selectedReservation = await reservationService.getReservation(id);
//       set({ selectedReservation });
//     } finally {
//       set({ isLoading: false });
//     }
//   },
//   cancelReservation: async (id: string) => {
//     set({ isLoading: true });
//     try {
//       await reservationService.cancelReservation(id);
//       set((state) => ({
//         reservations: state.reservations.map((reservation) =>
//           reservation.id === id ? { ...reservation, status: 'cancelled' } : reservation
//         )
//       }));
//     } finally {
//       set({ isLoading: false });
//     }
//   }
// }));

// export default useReservationStore;
