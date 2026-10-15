// src/modules/rate-history/entities/occupancy-rate-snapshot.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

/**
 * Precio por hora "congelado" al momento del ingreso de un vehículo.
 * Así, si la tarifa cambia o se elimina mientras el vehículo está adentro,
 * el egreso se cobra con la tarifa vigente al ingresar.
 *
 * Es una tabla aparte (y no una columna nueva en `occupancies`) para no
 * modificar la entidad Occupancy que comparten todas las ramas: con
 * `synchronize: true`, una rama sin la columna la borraría al levantar.
 */
@Entity('occupancy_rate_snapshots')
export class OccupancyRateSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'occupancy_id', type: 'uuid', unique: true })
  occupancyId!: string;

  @Column({ name: 'rate_id', type: 'uuid' })
  rateId!: string;

  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType })
  vehicleType!: VehicleType;

  @Column({ name: 'price_per_hour', type: 'decimal', precision: 10, scale: 2 })
  pricePerHour!: number;

  @CreateDateColumn({ name: 'captured_at', type: 'timestamp' })
  capturedAt!: Date;
}
