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
import { ServicePricing } from '../../parking-profiles/entities/service-pricing.embedded';

export type ServiceSelectionSource = 'catalog' | 'custom';
export type ServiceSelectionVia = 'qr' | 'manual' | 'edit';

/**
 * selected: pedido (se cobra salvo que se marque como no realizado)
 * performed: el personal confirmó que se prestó
 * not_performed: el personal indicó que no se prestó (no se cobra)
 */
export type ServiceExecutionStatus = 'selected' | 'performed' | 'not_performed';
export const SERVICE_EXECUTION_STATUSES: ServiceExecutionStatus[] = [
  'selected',
  'performed',
  'not_performed',
];

/**
 * Servicio solicitado para UNA ocupación. Guarda una copia del nombre y del
 * precio vigentes al momento de seleccionarlo: si el dueño cambia el precio o
 * desactiva el servicio después, esta ocupación conserva lo acordado.
 * Tabla aparte para no modificar la entidad Occupancy compartida.
 */
@Entity('occupancy_service_selections')
@Unique('UQ_occupancy_service_key', ['occupancyId', 'serviceKey'])
export class OccupancyServiceSelection {
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

  /** 'catalog:<code>' o 'custom:<uuid>' */
  @Column({ name: 'service_key', type: 'varchar', length: 80 })
  serviceKey!: string;

  @Column({ type: 'varchar', length: 10 })
  source!: ServiceSelectionSource;

  /** Copia del nombre al seleccionarlo */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /** Copia del precio al seleccionarlo */
  @Column(() => ServicePricing, { prefix: false })
  pricing!: ServicePricing;

  @Column({ name: 'selected_via', type: 'varchar', length: 10 })
  selectedVia!: ServiceSelectionVia;

  @Column({ name: 'selected_by', type: 'uuid', nullable: true })
  selectedBy!: string | null;

  @CreateDateColumn({ name: 'selected_at', type: 'timestamp' })
  selectedAt!: Date;

  @Column({ type: 'varchar', length: 15, default: 'selected' })
  status!: ServiceExecutionStatus;

  @Column({ name: 'status_updated_by', type: 'uuid', nullable: true })
  statusUpdatedBy!: string | null;

  @Column({ name: 'status_updated_at', type: 'timestamp', nullable: true })
  statusUpdatedAt!: Date | null;
}
