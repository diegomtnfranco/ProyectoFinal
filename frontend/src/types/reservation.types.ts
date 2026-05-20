export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired';

export interface Reservation {
  id: string;
  parkingLotId: string;
  parkingLotName: string;
  spaceId: string;
  vehicleType: 'car' | 'truck' | 'bike';
  plateNumber: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: ReservationStatus;
  createdAt: string;
}
