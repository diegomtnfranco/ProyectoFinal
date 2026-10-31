import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NightRateMode } from '../../parking-profiles/parking-profiles.constants';
import { decimalTransformer } from '../../parking-profiles/entities/service-pricing.embedded';

/**
 * Política nocturna y horario vigentes al ingresar el vehículo. Si el dueño
 * cambia la configuración mientras el vehículo está adentro, el egreso se
 * calcula con lo que regía al ingresar (mismo criterio que la tarifa por hora).
 */
@Entity('occupancy_night_policy_snapshots')
export class OccupancyNightPolicySnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'occupancy_id', type: 'uuid', unique: true })
  occupancyId!: string;

  @Column({ type: 'enum', enum: NightRateMode })
  mode!: NightRateMode;

  @Column({
    name: 'night_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  nightAmount!: number | null;

  @Column({ name: 'open_time', type: 'varchar', length: 5 })
  openTime!: string;

  @Column({ name: 'close_time', type: 'varchar', length: 5 })
  closeTime!: string;

  @Column({ name: 'tolerance_minutes', type: 'int' })
  toleranceMinutes!: number;

  @CreateDateColumn({ name: 'captured_at', type: 'timestamp' })
  capturedAt!: Date;
}
