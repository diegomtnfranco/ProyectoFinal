import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ParkingLot } from '../../parking-lots/entities/parking-lot.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export enum RateType {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

@Entity('rates')
export class Rate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  @ManyToOne(() => ParkingLot)
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot!: ParkingLot;

  // ✅ Usamos enum directamente, no relación
  @Column({ type: 'enum', enum: VehicleType })
  vehicleType!: VehicleType;

  @Column({ name: 'price_per_hour', type: 'decimal', precision: 10, scale: 2 })
  pricePerHour!: number;

  @Column({ type: 'enum', enum: RateType, default: RateType.HOURLY })
  rateType!: RateType;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime?: string;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
