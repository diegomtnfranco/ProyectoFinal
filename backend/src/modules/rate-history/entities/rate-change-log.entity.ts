// src/modules/rate-history/entities/rate-change-log.entity.ts
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

export enum RateChangeAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
}

/**
 * Historial de altas, ediciones y bajas de tarifas.
 * Tabla nueva e independiente: no altera `rates` ni ninguna otra tabla existente.
 * Guarda nombre y email del usuario en el momento del cambio para que la
 * tarjeta de actividad no dependa de que el usuario siga existiendo.
 */
@Entity('rate_change_logs')
@Index(['parkingLotId', 'createdAt'])
export class RateChangeLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  @Column({ name: 'rate_id', type: 'uuid' })
  rateId!: string;

  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType })
  vehicleType!: VehicleType;

  @Column({ type: 'enum', enum: RateChangeAction })
  action!: RateChangeAction;

  @Column({ name: 'previous_price_per_hour', type: 'decimal', precision: 10, scale: 2, nullable: true })
  previousPricePerHour!: number | null;

  @Column({ name: 'new_price_per_hour', type: 'decimal', precision: 10, scale: 2, nullable: true })
  newPricePerHour!: number | null;

  @Column({ name: 'changed_by_user_id', type: 'uuid', nullable: true })
  changedByUserId!: string | null;

  @Column({ name: 'changed_by_name', type: 'varchar', nullable: true })
  changedByName!: string | null;

  @Column({ name: 'changed_by_email', type: 'varchar', nullable: true })
  changedByEmail!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
