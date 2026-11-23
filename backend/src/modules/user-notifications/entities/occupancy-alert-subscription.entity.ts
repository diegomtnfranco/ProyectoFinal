import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ParkingLot } from '../../parking-lots/entities/parking-lot.entity';

/** Alerta "avisame cuando se libere un lugar" de un cliente para un estacionamiento */
@Entity('occupancy_alert_subscriptions')
@Unique('UQ_occupancy_alert_user_lot', ['userId', 'parkingLotId'])
export class OccupancyAlertSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  @ManyToOne(() => ParkingLot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot!: ParkingLot;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  /** Última activación: una suscripción nueva no queda bloqueada por un cooldown anterior */
  @Column({ name: 'activated_at', type: 'timestamp' })
  activatedAt!: Date;

  @Column({ name: 'last_notified_at', type: 'timestamp', nullable: true })
  lastNotifiedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
