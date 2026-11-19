import { BadRequestException, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { formatArs } from './money.util';
import { PaymentErrorCode, WALLET_CURRENCY, WalletTxKind, WalletTxType, walletLimits } from './payments.constants';

export interface WalletView {
  id: string;
  balanceCents: number;
  currency: string;
  totalLoadedCents: number;
  totalSpentCents: number;
  createdAt: Date;
  isDemo: true;
}

export interface WalletTransactionView {
  id: string;
  type: string;
  kind: string;
  amountCents: number;
  balanceAfterCents: number;
  description: string;
  paymentId: string | null;
  createdAt: Date;
}

/**
 * Billetera demo. El saldo se modifica solo acá, con el wallet bloqueado
 * (SELECT ... FOR UPDATE) y registrando el movimiento en la misma transacción.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet) private readonly wallets: Repository<Wallet>,
    @InjectRepository(WalletTransaction) private readonly transactions: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  /** Crea la billetera la primera vez (UNIQUE user_id evita duplicados aun en paralelo) */
  async getOrCreate(userId: string, manager: EntityManager = this.dataSource.manager): Promise<Wallet> {
    const existing = await manager.findOne(Wallet, { where: { userId } });
    if (existing) return existing;
    await manager
      .createQueryBuilder()
      .insert()
      .into(Wallet)
      .values({ userId, currency: WALLET_CURRENCY })
      .orIgnore()
      .execute();
    return manager.findOneOrFail(Wallet, { where: { userId } });
  }

  async getMine(userId: string): Promise<WalletView> {
    return this.toView(await this.getOrCreate(userId));
  }

  async listMine(userId: string, page = 1, limit = 20) {
    const wallet = await this.getOrCreate(userId);
    const [rows, total] = await this.transactions.findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((r) => this.toTxView(r)), page, limit, total, hasMore: page * limit < total };
  }

  /** Carga simulada: no llama a ningún proveedor externo */
  async topUp(userId: string, amountCents: number, idempotencyKey?: string | null) {
    const { minTopUpCents, maxTopUpCents } = walletLimits();
    if (!Number.isSafeInteger(amountCents) || amountCents < minTopUpCents || amountCents > maxTopUpCents) {
      throw new BadRequestException(
        `El importe debe ser un número entero entre ${formatArs(minTopUpCents)} y ${formatArs(maxTopUpCents)}`,
      );
    }
    const { id: walletId } = await this.getOrCreate(userId);

    return this.dataSource.transaction(async (manager) => {
      const wallet = await this.lock(manager, walletId);

      if (idempotencyKey) {
        const repeated = await manager.findOne(WalletTransaction, { where: { walletId, idempotencyKey } });
        if (repeated) return { wallet: this.toView(wallet), transaction: this.toTxView(repeated), replayed: true };
      }

      const balanceAfter = wallet.balanceCents + amountCents;
      const tx = await manager.save(
        manager.create(WalletTransaction, {
          walletId,
          type: WalletTxType.CREDIT,
          kind: WalletTxKind.DEMO_TOPUP,
          amountCents,
          balanceAfterCents: balanceAfter,
          description: 'Carga de dinero demo',
          paymentId: null,
          idempotencyKey: idempotencyKey ?? null,
        }),
      );
      wallet.balanceCents = balanceAfter;
      wallet.totalLoadedCents += amountCents;
      await manager.save(wallet);
      return { wallet: this.toView(wallet), transaction: this.toTxView(tx), replayed: false };
    });
  }

  /** Bloquea la fila de la billetera hasta el fin de la transacción */
  async lock(manager: EntityManager, walletId: string): Promise<Wallet> {
    return manager.findOneOrFail(Wallet, { where: { id: walletId }, lock: { mode: 'pessimistic_write' } });
  }

  /**
   * Débito para un pago. Debe llamarse dentro de una transacción con el wallet
   * ya bloqueado (lock). Además de la validación, el CHECK de la base impide saldo negativo.
   */
  async debitLocked(
    manager: EntityManager,
    wallet: Wallet,
    amountCents: number,
    paymentId: string,
    description: string,
    idempotencyKey: string | null,
  ): Promise<WalletTransaction> {
    if (wallet.balanceCents < amountCents) {
      throw new UnprocessableEntityException({
        code: PaymentErrorCode.INSUFFICIENT_FUNDS,
        message: 'Saldo insuficiente',
        balanceCents: wallet.balanceCents,
        amountCents,
        canUseMercadoPago: true,
      });
    }
    const balanceAfter = wallet.balanceCents - amountCents;
    const tx = await manager.save(
      manager.create(WalletTransaction, {
        walletId: wallet.id,
        type: WalletTxType.DEBIT,
        kind: WalletTxKind.PAYMENT,
        amountCents,
        balanceAfterCents: balanceAfter,
        description: description.slice(0, 200),
        paymentId,
        idempotencyKey,
      }),
    );
    wallet.balanceCents = balanceAfter;
    wallet.totalSpentCents += amountCents;
    await manager.save(wallet);
    return tx;
  }

  /** Contraste saldo vs. movimientos (para pruebas y diagnóstico) */
  async reconcile(walletId: string): Promise<{ balanceCents: number; ledgerCents: number; ok: boolean }> {
    const [row] = await this.dataSource.query(
      `SELECT w.balance_cents AS balance,
              COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount_cents ELSE -t.amount_cents END), 0) AS ledger
         FROM wallets w LEFT JOIN wallet_transactions t ON t.wallet_id = w.id
        WHERE w.id = $1 GROUP BY w.id`,
      [walletId],
    );
    const balanceCents = Number(row?.balance ?? 0);
    const ledgerCents = Number(row?.ledger ?? 0);
    return { balanceCents, ledgerCents, ok: balanceCents === ledgerCents };
  }

  toView(w: Wallet): WalletView {
    return {
      id: w.id,
      balanceCents: w.balanceCents,
      currency: w.currency,
      totalLoadedCents: w.totalLoadedCents,
      totalSpentCents: w.totalSpentCents,
      createdAt: w.createdAt,
      isDemo: true,
    };
  }

  toTxView(t: WalletTransaction): WalletTransactionView {
    return {
      id: t.id,
      type: t.type,
      kind: t.kind,
      amountCents: t.amountCents,
      balanceAfterCents: t.balanceAfterCents,
      description: t.description,
      paymentId: t.paymentId,
      createdAt: t.createdAt,
    };
  }
}
