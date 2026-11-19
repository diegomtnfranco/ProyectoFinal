import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { centsTransformer } from '../money.util';

/**
 * Billetera demo de un cliente (dinero ficticio, no es una cuenta real).
 * El saldo solo cambia desde WalletService, siempre junto con un movimiento
 * en wallet_transactions dentro de la misma transacción de base de datos.
 */
@Entity('wallets')
@Unique('UQ_wallets_user', ['userId'])
@Check('CHK_wallets_balance_nonneg', '"balance_cents" >= 0')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'balance_cents', type: 'bigint', default: 0, transformer: centsTransformer })
  balanceCents!: number;

  @Column({ type: 'varchar', length: 3, default: 'ARS' })
  currency!: string;

  @Column({ name: 'total_loaded_cents', type: 'bigint', default: 0, transformer: centsTransformer })
  totalLoadedCents!: number;

  @Column({ name: 'total_spent_cents', type: 'bigint', default: 0, transformer: centsTransformer })
  totalSpentCents!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
