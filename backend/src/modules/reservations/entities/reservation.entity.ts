// src/modules/reservations/entities/reservation.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  JoinColumn, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';
import { ClientProfile } from '../../client-profiles/entities/client-profile.entity';
import { Space } from '../../spaces/entities/space.entity';
import { Rate } from '../../rates/entities/rate.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export enum ReservationStatus {
  PENDING_PAYMENT = 'pending_payment',
  PENDING_CONFIRMATION = 'pending_confirmation',  // ← esperando confirmación del parking
  CONFIRMED = 'confirmed',
  CANCELLED_BY_CLIENT = 'cancelled_by_client',
  CANCELLED_BY_PARKING = 'cancelled_by_parking',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => ClientProfile)
  @JoinColumn({ name: 'client_id' })
  client!: ClientProfile;

  @Column({ name: 'space_id', type: 'uuid' })
  spaceId!: string;

  @ManyToOne(() => Space)
  @JoinColumn({ name: 'space_id' })
  space!: Space;

  @Column({ type: 'enum', enum: VehicleType })
  vehicleType!: VehicleType;

  @Column({ name: 'vehicle_plate' })
  vehiclePlate!: string;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime!: Date;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING_CONFIRMATION })
  status!: ReservationStatus;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalAmount?: number;

  @Column({ name: 'applied_rate_id', type: 'uuid', nullable: true })
  appliedRateId?: string;

  @ManyToOne(() => Rate, { nullable: true })
  @JoinColumn({ name: 'applied_rate_id' })
  appliedRate?: Rate;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ nullable: true })
  cancellationReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}