import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ParkingLot } from '../../parking-lots/entities/parking-lot.entity';
import { ServicePricing } from './service-pricing.embedded';

/** Servicio creado por el dueño; pertenece a un único estacionamiento */
@Entity('parking_lot_custom_services')
export class ParkingLotCustomService {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  @ManyToOne(() => ParkingLot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot!: ParkingLot;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  conditions!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column(() => ServicePricing, { prefix: false })
  pricing!: ServicePricing;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
