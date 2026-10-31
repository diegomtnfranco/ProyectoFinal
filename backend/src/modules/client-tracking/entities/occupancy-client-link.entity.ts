import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Occupancy } from '../../occupancy/entities/occupancy.entity';
import { ClientProfile } from '../../client-profiles/entities/client-profile.entity';
import { ClientVehicle } from '../../client-vehicles/entities/client-vehicle.entity';

/**
 * linked: el cliente puede seguir este ingreso.
 * skipped_limit: la patente coincidía pero el cliente ya tenía 3 seguimientos activos;
 *                se registra para informarlo, sin bloquear el ingreso ni pisar otros.
 */
export type ClientLinkStatus = 'linked' | 'skipped_limit';

/**
 * Relación N clientes ↔ 1 ocupación (misma patente registrada por varios clientes).
 * No guarda si el vehículo está adentro: eso lo dice occupancies.is_completed.
 */
@Entity('occupancy_client_links')
@Unique('UQ_occupancy_client', ['occupancyId', 'clientProfileId'])
export class OccupancyClientLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'occupancy_id', type: 'uuid' })
  occupancyId!: string;

  @ManyToOne(() => Occupancy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'occupancy_id' })
  occupancy!: Occupancy;

  @Column({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  @Index()
  @Column({ name: 'client_profile_id', type: 'uuid' })
  clientProfileId!: string;

  @ManyToOne(() => ClientProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: ClientProfile;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'client_vehicle_id', type: 'uuid', nullable: true })
  clientVehicleId!: string | null;

  @ManyToOne(() => ClientVehicle, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'client_vehicle_id' })
  clientVehicle!: ClientVehicle | null;

  /** Copia de los datos del vehículo al ingresar (el cliente puede editarlo después) */
  @Column({ name: 'vehicle_name', type: 'varchar', length: 50, nullable: true })
  vehicleName!: string | null;

  @Column({
    name: 'vehicle_brand',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  vehicleBrand!: string | null;

  @Column({
    name: 'vehicle_model',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  vehicleModel!: string | null;

  @Column({ type: 'varchar', length: 15 })
  status!: ClientLinkStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
