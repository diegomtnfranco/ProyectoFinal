export interface TicketData {
  ticketNumber: string;

  parkingLot: {
    name: string;
    address: string;
    phone?: string;
  };

  vehiclePlate: string;

  vehicleType?: string;

  checkInTime: string;

  checkOutTime: string;

  duration: string;

  pricePerHour?: number;

  totalAmount: number;

  isAnonymous?: boolean;
}