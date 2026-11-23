import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ParkingLot } from '../../parking-lots/entities/parking-lot.entity';

/** Información general publicada por el estacionamiento (1:1 con parking_lots) */
@Entity('parking_lot_profiles')
export class ParkingLotProfile {
  @PrimaryColumn({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  @OneToOne(() => ParkingLot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot!: ParkingLot;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
