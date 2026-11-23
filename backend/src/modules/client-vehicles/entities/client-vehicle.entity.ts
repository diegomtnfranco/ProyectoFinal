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
import { ClientProfile } from '../../client-profiles/entities/client-profile.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

/**
 * Vehículo registrado por un cliente (máximo 3 por cliente, validado en el servicio).
 * Tabla nueva: las columnas default_vehicle_* de client_profiles no se modifican.
 */
@Entity('client_vehicles')
@Unique('UQ_client_vehicle_plate', ['clientProfileId', 'plateNormalized'])
export class ClientVehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'client_profile_id', type: 'uuid' })
  clientProfileId!: string;

  @ManyToOne(() => ClientProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: ClientProfile;

  @Column({ type: 'varchar', length: 50, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  brand!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  model!: string | null;

  /** Patente tal como la cargó el cliente */
  @Column({ type: 'varchar', length: 15 })
  plate!: string;

  /** Solo para comparar (ver normalizePlate) */
  @Index()
  @Column({ name: 'plate_normalized', type: 'varchar', length: 15 })
  plateNormalized!: string;

  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType })
  vehicleType!: VehicleType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
