import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Occupancy } from '../../entities/occupancy.entity';
import { centsTransformer } from '../../../payments/money.util';
import type {
  CheckoutRequestMethodValue,
  CheckoutRequestStatusValue,
} from '../checkout.constants';

/**
 * Solicitud de egreso con pago en efectivo hecha por el cliente desde el QR.
 * No libera el espacio ni cierra la ocupación: eso lo hace el personal.
 *
 * Garantía en la base: una sola solicitud PENDING por ocupación (índice único parcial).
 */
@Entity('checkout_requests')
@Index('UQ_checkout_requests_pending_occupancy', ['occupancyId'], {
  unique: true,
  where: `"status" = 'PENDING'`,
})
@Index('IDX_checkout_requests_lot_status', ['parkingLotId', 'status'])
@Index('IDX_checkout_requests_user', ['userId', 'createdAt'])
@Check('CHK_checkout_requests_quoted', '"quoted_amount_cents" >= 0')
export class CheckoutRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'occupancy_id', type: 'uuid' })
  occupancyId!: string;

  @ManyToOne(() => Occupancy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'occupancy_id' })
  occupancy?: Occupancy;

  @Column({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  /** Cliente que pidió salir */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 10 })
  method!: CheckoutRequestMethodValue;

  @Column({ type: 'varchar', length: 20 })
  status!: CheckoutRequestStatusValue;

  /** Importe estimado al momento de la solicitud (el final se calcula al registrar el egreso) */
  @Column({
    name: 'quoted_amount_cents',
    type: 'bigint',
    transformer: centsTransformer,
  })
  quotedAmountCents!: number;

  /** Copia de la patente al pedir la salida (para el aviso y la trazabilidad) */
  @Column({
    name: 'vehicle_plate',
    type: 'varchar',
    length: 15,
    nullable: true,
  })
  vehiclePlate!: string | null;

  /** Dueño/empleado que registró el egreso, o el propio cliente si canceló o pagó con billetera */
  @Column({ name: 'resolved_by_user_id', type: 'uuid', nullable: true })
  resolvedByUserId!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  /** Pago aprobado con el que se resolvió (PRESENTIAL o WALLET) */
  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
