import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { ParkingLot } from '../../parking-lots/entities/parking-lot.entity';

export type AvailabilityState = 'full' | 'available';

/**
 * Estado de la máquina de ocupación por estacionamiento (persistente: sobrevive
 * reinicios). No duplica la ocupación: solo recuerda la última transición.
 */
@Entity('parking_availability_states')
export class ParkingAvailabilityState {
  @PrimaryColumn({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  @OneToOne(() => ParkingLot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot!: ParkingLot;

  @Column({ type: 'varchar', length: 10 })
  state!: AvailabilityState;

  /** Desde cuándo está completo (inicio del cooldown) */
  @Column({ name: 'full_since', type: 'timestamp', nullable: true })
  fullSince!: Date | null;

  /** Última vez que se notificó una liberación en este estacionamiento */
  @Column({ name: 'last_notified_at', type: 'timestamp', nullable: true })
  lastNotifiedAt!: Date | null;

  @Column({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
