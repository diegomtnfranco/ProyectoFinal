import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ParkingLot } from '../../parking-lots/entities/parking-lot.entity';
import { ParkingCatalogOption } from './parking-catalog-option.entity';
import { ServicePricing } from './service-pricing.embedded';

/**
 * Configuración de una opción del catálogo para UN estacionamiento.
 * Si no existe fila, la opción está desactivada (sin activaciones por defecto).
 */
@Entity('parking_lot_catalog_selections')
@Unique('UQ_parking_lot_catalog_option', ['parkingLotId', 'optionId'])
export class ParkingLotCatalogSelection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  @ManyToOne(() => ParkingLot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot!: ParkingLot;

  @Column({ name: 'option_id', type: 'uuid' })
  optionId!: string;

  @ManyToOne(() => ParkingCatalogOption, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'option_id' })
  option!: ParkingCatalogOption;

  @Column({ name: 'is_enabled', default: false })
  isEnabled!: boolean;

  /** Aclaración del dueño (ej. "solo planta baja") */
  @Column({ type: 'varchar', length: 500, nullable: true })
  notes!: string | null;

  /** Condiciones del servicio (solo servicios) */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  conditions!: string | null;

  /** Precio (solo servicios; null en características físicas) */
  @Column(() => ServicePricing, { prefix: false })
  pricing!: ServicePricing;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
