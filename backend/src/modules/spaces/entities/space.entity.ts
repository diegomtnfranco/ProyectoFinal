import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { ParkingLot } from '../../parking-lots/entities/parking-lot.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export enum SpaceStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance',
}

@Entity('spaces')
export class Space {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  @ManyToOne(() => ParkingLot)
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot!: ParkingLot;

  @Column({ name: 'space_number' })
  spaceNumber!: string;

  @Column({ type: 'jsonb', default: [] })
  allowedVehicleTypes!: VehicleType[];

  @Column({ type: 'enum', enum: SpaceStatus, default: SpaceStatus.AVAILABLE })
  status!: SpaceStatus;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_reserved', default: false })
  isReserved!: boolean;

  @Column({ name: 'reserved_until', type: 'timestamp with time zone', nullable: true })
  reservedUntil?: Date | null;

  @Column({ name: 'occupied_since', type: 'timestamp with time zone', nullable: true })
  occupiedSince?: Date | null;

  @Column({ name: 'allows_reservations', default: false })
  allowsReservations!: boolean;

  @Column({ name: 'occupied_by_vehicle_plate', type: 'varchar', nullable: true })
  occupiedByVehiclePlate?: string | null;

  @Column({ name: 'occupied_by_vehicle_type', type: 'enum', enum: VehicleType, nullable: true })
  occupiedByVehicleType?: VehicleType | null;

  @Column({ type: 'jsonb', default: {} })
  metadata?: {
    widthMeters?: number;
    lengthMeters?: number;
    hasEvCharger?: boolean;
    isCovered?: boolean;
    floor?: number;
    zone?: string;
  };
}