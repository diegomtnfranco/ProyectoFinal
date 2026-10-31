import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ParkingLot } from '../../parking-lots/entities/parking-lot.entity';
import { NightRateMode } from '../parking-profiles.constants';
import { decimalTransformer } from './service-pricing.embedded';

/**
 * Política de tarifa nocturna de un estacionamiento. Sin fila = HOURLY
 * (comportamiento histórico). Tabla aparte para no modificar parking_lots.
 */
@Entity('parking_lot_night_policies')
export class ParkingLotNightPolicy {
  @PrimaryColumn({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  @OneToOne(() => ParkingLot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot!: ParkingLot;

  @Column({ type: 'enum', enum: NightRateMode, default: NightRateMode.HOURLY })
  mode!: NightRateMode;

  /** Importe por noche (solo se aplica en modo SPECIAL; se conserva al volver a HOURLY) */
  @Column({
    name: 'night_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  nightAmount!: number | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
