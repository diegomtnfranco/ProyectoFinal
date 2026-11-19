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
import { ParkingLot } from '../../parking-lots/entities/parking-lot.entity';
import { centsTransformer } from '../money.util';
import type { ObligationTypeValue, PaymentMethodValue, PaymentStatusValue } from '../payments.constants';

/**
 * Operación de pago de una obligación (reserva confirmada o egreso facturado).
 * El estado del pago es independiente del estado de la reserva/ocupación.
 *
 * Garantías en la base:
 * - Una sola fila PENDING o APPROVED por obligación (índice único parcial):
 *   no puede haber dos intentos activos ni dos cobros aprobados.
 * - Un pago externo de Mercado Pago no se puede asociar a dos pagos internos.
 */
@Entity('payments')
@Index('UQ_payments_active_obligation', ['obligationKey'], {
  unique: true,
  where: `"status" IN ('PENDING', 'APPROVED')`,
})
@Index('UQ_payments_external_payment', ['externalPaymentId'], {
  unique: true,
  where: '"external_payment_id" IS NOT NULL',
})
@Index('IDX_payments_lot_approved', ['parkingLotId', 'approvedAt'])
@Index('IDX_payments_payer_created', ['payerUserId', 'createdAt'])
@Index('IDX_payments_occupancy', ['occupancyId'])
@Index('IDX_payments_reservation', ['reservationId'])
@Check('CHK_payments_amount_positive', '"amount_cents" > 0')
@Check(
  'CHK_payments_obligation_ref',
  `("obligation_type" = 'RESERVATION' AND "reservation_id" IS NOT NULL) OR ("obligation_type" = 'OCCUPANCY' AND "occupancy_id" IS NOT NULL)`,
)
export class Payment {
  /** También se usa como external_reference en Mercado Pago */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Cliente que paga. Null solo en pagos presenciales de vehículos sin cliente registrado */
  @Column({ name: 'payer_user_id', type: 'uuid', nullable: true })
  payerUserId!: string | null;

  @Column({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  @ManyToOne(() => ParkingLot, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot?: ParkingLot;

  @Column({ name: 'obligation_type', type: 'varchar', length: 12 })
  obligationType!: ObligationTypeValue;

  @Column({ name: 'reservation_id', type: 'uuid', nullable: true })
  reservationId!: string | null;

  @Column({ name: 'occupancy_id', type: 'uuid', nullable: true })
  occupancyId!: string | null;

  /** reservation:<id> | occupancy:<id> */
  @Column({ name: 'obligation_key', type: 'varchar', length: 60 })
  obligationKey!: string;

  @Column({ name: 'vehicle_plate', type: 'varchar', length: 15, nullable: true })
  vehiclePlate!: string | null;

  @Column({ type: 'varchar', length: 200 })
  concept!: string;

  /** Importe facturado por EstacionApp al crear el pago (copia: no cambia si cambian las tarifas) */
  @Column({ name: 'billed_amount_cents', type: 'bigint', transformer: centsTransformer })
  billedAmountCents!: number;

  /** Parte ya cubierta por el pago de la reserva (egresos con reserva pagada) */
  @Column({ name: 'covered_amount_cents', type: 'bigint', default: 0, transformer: centsTransformer })
  coveredAmountCents!: number;

  /** Importe que se cobra en esta operación */
  @Column({ name: 'amount_cents', type: 'bigint', transformer: centsTransformer })
  amountCents!: number;

  @Column({ type: 'varchar', length: 3, default: 'ARS' })
  currency!: string;

  @Column({ type: 'varchar', length: 20 })
  method!: PaymentMethodValue;

  @Column({ type: 'varchar', length: 12 })
  status!: PaymentStatusValue;

  @Column({ name: 'status_detail', type: 'varchar', length: 80, nullable: true })
  statusDetail!: string | null;

  @Column({ name: 'external_payment_id', type: 'varchar', length: 40, nullable: true })
  externalPaymentId!: string | null;

  @Column({ name: 'external_preference_id', type: 'varchar', length: 80, nullable: true })
  externalPreferenceId!: string | null;

  @Column({ name: 'checkout_url', type: 'varchar', length: 500, nullable: true })
  checkoutUrl!: string | null;

  /** Vencimiento del intento de Mercado Pago */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  /** Dueño o empleado que registró un cobro presencial */
  @Column({ name: 'registered_by_user_id', type: 'uuid', nullable: true })
  registeredByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
