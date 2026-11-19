import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PaymentEventSource = 'WALLET' | 'PRESENTIAL' | 'MP_CHECKOUT' | 'MP_WEBHOOK' | 'MP_SYNC' | 'SYSTEM';

/**
 * Auditoría de pagos (solo inserciones): cambios de estado, notificaciones
 * repetidas, firmas inválidas, importes que no coinciden, duplicados externos.
 * Nunca guarda credenciales ni tokens.
 */
@Entity('payment_events')
@Index('IDX_payment_events_payment', ['paymentId', 'createdAt'])
export class PaymentEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  source!: PaymentEventSource;

  @Column({ type: 'varchar', length: 60 })
  event!: string;

  @Column({ type: 'jsonb', default: {} })
  data!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
