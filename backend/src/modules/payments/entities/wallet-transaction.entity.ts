import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { centsTransformer } from '../money.util';
import type { WalletTxKindValue, WalletTxTypeValue } from '../payments.constants';
import { Wallet } from './wallet.entity';

/**
 * Libro de movimientos de la billetera demo. Solo se insertan filas:
 * no hay endpoints ni métodos para editar o borrar movimientos.
 */
@Entity('wallet_transactions')
@Index('IDX_wallet_tx_wallet_created', ['walletId', 'createdAt'])
@Index('UQ_wallet_tx_idempotency', ['walletId', 'idempotencyKey'], {
  unique: true,
  where: '"idempotency_key" IS NOT NULL',
})
@Check('CHK_wallet_tx_amount_positive', '"amount_cents" > 0')
@Check('CHK_wallet_tx_balance_nonneg', '"balance_after_cents" >= 0')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId!: string;

  @ManyToOne(() => Wallet, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'wallet_id' })
  wallet?: Wallet;

  @Column({ type: 'varchar', length: 6 })
  type!: WalletTxTypeValue;

  @Column({ type: 'varchar', length: 20 })
  kind!: WalletTxKindValue;

  @Column({ name: 'amount_cents', type: 'bigint', transformer: centsTransformer })
  amountCents!: number;

  @Column({ name: 'balance_after_cents', type: 'bigint', transformer: centsTransformer })
  balanceAfterCents!: number;

  @Column({ type: 'varchar', length: 200 })
  description!: string;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 80, nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
