import { VehicleType } from '../../common/enums/vehicle-type.enum';
import { ReservationStatus } from '../entities/reservation.entity';

export class ReservationResponseDto {
  id!: string;
  spaceId!: string;
  spaceNumber!: string;
  parkingLotId!: string;
  parkingLotName!: string;
  vehicleType!: VehicleType;
  vehiclePlate!: string;
  startTime!: string;
  endTime!: string;
  status!: ReservationStatus;
  totalAmount?: number;
  createdAt!: string;
  clientName?: string;  // ← Agregar (opcional, para mostrar en UI)
  expiresAt?: string; 
  avatarUrl?:string;
  /** Datos de la reserva programada (horarios en hora local del estacionamiento) */
  isScheduled?: boolean;
  baseAmount?: number;
  discountPercent?: number;
  parkingLotAddress?: string;
  /** Ej: '2026-11-24 10:00' (America/Argentina/Buenos_Aires) */
  startLocal?: string;
  endLocal?: string;
}