import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, QueryFailedError, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentEvent, PaymentEventSource } from './entities/payment-event.entity';
import { Obligation, ObligationResolverService } from './obligation-resolver.service';
import { ParkingAccessService, Requester } from './parking-access.service';
import { PaymentNotifierService } from './payment-notifier.service';
import { WalletService } from './wallet.service';
import { decimalToCents } from './money.util';
import {
  ACTIVE_STATUSES,
  ObligationType,
  ObligationTypeValue,
  PaymentErrorCode,
  PaymentMethod,
  PaymentMethodValue,
  PaymentStatus,
  PaymentStatusValue,
  WALLET_CURRENCY,
  obligationKey,
} from './payments.constants';

export type PaymentSummaryStatus = PaymentStatusValue | 'NONE' | 'COVERED';

/** Resumen que ven dueño y empleado en tarjetas/consultas (sin datos de billeteras) */
export interface PaymentSummary {
  status: PaymentSummaryStatus;
  method: PaymentMethodValue | null;
  amountCents: number | null;
  billedAmountCents: number | null;
  coveredAmountCents: number;
  paymentId: string | null;
  updatedAt: Date | null;
}

export interface PaymentView {
  id: string;
  obligationType: ObligationTypeValue;
  reservationId: string | null;
  occupancyId: string | null;
  parkingLotId: string;
  parkingLotName: string | null;
  vehiclePlate: string | null;
  concept: string;
  billedAmountCents: number;
  coveredAmountCents: number;
  amountCents: number;
  currency: string;
  method: PaymentMethodValue;
  status: PaymentStatusValue;
  statusDetail: string | null;
  externalPaymentId: string | null;
  expiresAt: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayableItem {
  obligationType: ObligationTypeValue;
  obligationId: string;
  parkingLotId: string;
  parkingLotName: string;
  vehiclePlate: string | null;
  concept: string;
  billedAmountCents: number;
  coveredAmountCents: number;
  amountCents: number;
  date: Date;
  pendingPayment: { id: string; method: PaymentMethodValue; expiresAt: Date | null } | null;
}

export interface ActivityPaymentRef {
  kind: 'OCCUPANCY' | 'RESERVATION';
  id: string;
  reservationId?: string | null;
  billedAmountCents?: number | null;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly resolver: ObligationResolverService,
    private readonly wallet: WalletService,
    private readonly access: ParkingAccessService,
    private readonly notifier: PaymentNotifierService,
  ) {}

  // ======================================================== pago con billetera

  /**
   * Débito, movimiento y pago aprobado en una única transacción.
   * Si cualquier paso falla, se revierte todo.
   */
  async payWithWallet(userId: string, type: ObligationTypeValue, id: string, idempotencyKey?: string | null) {
    const { id: walletId } = await this.wallet.getOrCreate(userId);

    const result = await this.runUnique(() =>
      this.dataSource.transaction(async (manager) => {
        // 1. Bloquear la billetera serializa los pagos del mismo cliente
        const wallet = await this.wallet.lock(manager, walletId);

        // 2. Reintento con la misma clave: devolver el pago original sin debitar otra vez
        if (idempotencyKey) {
          const repeated: { payment_id: string | null }[] = await manager.query(
            `SELECT payment_id FROM wallet_transactions WHERE wallet_id = $1 AND idempotency_key = $2`,
            [walletId, idempotencyKey],
          );
          if (repeated[0]?.payment_id) {
            const payment = await manager.findOneOrFail(Payment, { where: { id: repeated[0].payment_id } });
            return { payment, replayed: true, walletBalanceCents: wallet.balanceCents };
          }
        }

        // 3. Importe y dueño de la obligación: siempre los determina el backend
        const obligation = await this.resolver.resolve(manager, type, id);
        this.resolver.assertPayer(obligation, userId);
        this.resolver.assertSomethingToPay(obligation);
        await this.releaseObligation(manager, obligation.key, 'WALLET');

        // 4. Pago + débito
        const payment = await manager.save(
          this.newPayment(obligation, {
            payerUserId: userId,
            method: PaymentMethod.WALLET,
            status: PaymentStatus.APPROVED,
            approvedAt: new Date(),
          }),
        );
        await this.wallet.debitLocked(manager, wallet, payment.amountCents, payment.id, payment.concept, idempotencyKey ?? null);
        await this.logEvent(manager, payment.id, 'WALLET', 'APPROVED', { amountCents: payment.amountCents });
        return { payment, replayed: false, walletBalanceCents: wallet.balanceCents };
      }),
    );

    if (!result.replayed) void this.notifier.notifyStatus(result.payment);
    return { payment: await this.toView(result.payment), walletBalanceCents: result.walletBalanceCents, replayed: result.replayed };
  }

  // ======================================================== pago presencial (D4)

  /**
   * El dueño o un empleado del estacionamiento registra que el cliente pagó en
   * el lugar. Evita que se le pida el pago en la app. No mueve dinero de billeteras.
   */
  async registerPresential(user: Requester, type: ObligationTypeValue, id: string) {
    const payment = await this.runUnique(() =>
      this.dataSource.transaction(async (manager) => {
        const obligation = await this.resolver.resolve(manager, type, id);
        await this.access.assertStaff(obligation.parkingLotId, user);
        this.resolver.assertSomethingToPay(obligation);
        await this.releaseObligation(manager, obligation.key, 'PRESENTIAL');

        const saved = await manager.save(
          this.newPayment(obligation, {
            // Con varios clientes vinculados a la misma patente no se sabe quién pagó: queda sin cliente
            payerUserId: obligation.payerUserIds.length === 1 ? obligation.payerUserIds[0] : null,
            method: PaymentMethod.PRESENTIAL,
            status: PaymentStatus.APPROVED,
            approvedAt: new Date(),
            registeredByUserId: user.id,
            statusDetail: 'registered_by_staff',
          }),
        );
        await this.logEvent(manager, saved.id, 'PRESENTIAL', 'APPROVED', { registeredBy: user.id, role: user.role });
        return saved;
      }),
    );
    void this.notifier.notifyStatus(payment);
    return this.toView(payment);
  }

  // ======================================================== consultas del cliente

  async listMine(userId: string, page = 1, limit = 20) {
    const [rows, total] = await this.payments.findAndCount({
      where: { payerUserId: userId },
      relations: ['parkingLot'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((p) => this.viewOf(p, p.parkingLot?.name ?? null)), page, limit, total, hasMore: page * limit < total };
  }

  async getMine(userId: string, paymentId: string): Promise<PaymentView> {
    const payment = await this.payments.findOne({ where: { id: paymentId, payerUserId: userId }, relations: ['parkingLot'] });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    return this.viewOf(payment, payment.parkingLot?.name ?? null);
  }

  /** Reservas confirmadas y egresos con importe pendiente que el cliente puede pagar */
  async listPayable(userId: string): Promise<PayableItem[]> {
    const candidates: { type: ObligationTypeValue; id: string; at: Date }[] = await this.dataSource.query(
      `SELECT 'RESERVATION' AS type, r.id, r.start_time AS at
         FROM reservations r JOIN client_profiles cp ON cp.id = r.client_id
        WHERE cp.user_id = $1 AND r.status = 'confirmed'
          AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.obligation_key = 'reservation:' || r.id::text AND p.status = 'APPROVED')
       UNION ALL
       SELECT 'OCCUPANCY' AS type, o.id, o.check_out_time AS at
         FROM occupancies o
        WHERE o.is_completed = true AND o."totalAmount" IS NOT NULL
          AND o.check_out_time > (now() - interval '60 days')
          AND (
            EXISTS (SELECT 1 FROM occupancy_client_links l WHERE l.occupancy_id = o.id AND l.user_id = $1 AND l.status = 'linked')
            OR EXISTS (SELECT 1 FROM reservations r JOIN client_profiles cp ON cp.id = r.client_id
                        WHERE r.id = o.reservation_id AND cp.user_id = $1)
          )
          AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.obligation_key = 'occupancy:' || o.id::text AND p.status = 'APPROVED')
        ORDER BY at DESC
        LIMIT 50`,
      [userId],
    );

    const items: PayableItem[] = [];
    for (const c of candidates) {
      let obligation: Obligation;
      try {
        obligation = await this.resolver.resolve(this.dataSource.manager, c.type, c.id);
      } catch {
        continue; // dejó de ser pagable entre la consulta y la resolución
      }
      if (obligation.amountCents <= 0 || !obligation.payerUserIds.includes(userId)) continue;
      const pending = await this.payments.findOne({
        where: { obligationKey: obligation.key, status: PaymentStatus.PENDING },
      });
      items.push({
        obligationType: obligation.type,
        obligationId: obligation.id,
        parkingLotId: obligation.parkingLotId,
        parkingLotName: obligation.parkingLotName,
        vehiclePlate: obligation.vehiclePlate,
        concept: obligation.concept,
        billedAmountCents: obligation.billedAmountCents,
        coveredAmountCents: obligation.coveredAmountCents,
        amountCents: obligation.amountCents,
        date: c.at,
        pendingPayment:
          pending && pending.payerUserId === userId
            ? { id: pending.id, method: pending.method, expiresAt: pending.expiresAt }
            : null,
      });
    }
    return items;
  }

  // ======================================================== consultas de staff

  async staffStatus(user: Requester, parkingLotId: string, query: { occupancyId?: string; reservationId?: string }) {
    await this.access.assertStaff(parkingLotId, user);
    let ref: ActivityPaymentRef;
    if (query.occupancyId) {
      const [row] = await this.dataSource.query(
        `SELECT o.id, o.reservation_id, o."totalAmount" AS total_amount FROM occupancies o JOIN spaces s ON s.id = o.space_id
          WHERE o.id = $1 AND s.parking_lot_id = $2`,
        [query.occupancyId, parkingLotId],
      );
      if (!row) throw new NotFoundException('Estadía no encontrada en este estacionamiento');
      ref = { kind: 'OCCUPANCY', id: row.id, reservationId: row.reservation_id, billedAmountCents: decimalToCents(row.total_amount) };
    } else if (query.reservationId) {
      const [row] = await this.dataSource.query(
        `SELECT r.id, r.total_amount FROM reservations r JOIN spaces s ON s.id = r.space_id
          WHERE r.id = $1 AND s.parking_lot_id = $2`,
        [query.reservationId, parkingLotId],
      );
      if (!row) throw new NotFoundException('Reserva no encontrada en este estacionamiento');
      ref = { kind: 'RESERVATION', id: row.id, billedAmountCents: decimalToCents(row.total_amount) };
    } else {
      throw new NotFoundException('Indicá occupancyId o reservationId');
    }
    const summaries = await this.summariesFor([ref]);
    return summaries.get(`${ref.kind}:${ref.id}`)!;
  }

  /**
   * Estado de pago de varias operaciones en una sola consulta (tarjetas de actividad).
   * Clave del Map: "<OCCUPANCY|RESERVATION>:<id>".
   */
  async summariesFor(refs: ActivityPaymentRef[]): Promise<Map<string, PaymentSummary>> {
    const result = new Map<string, PaymentSummary>();
    if (!refs.length) return result;

    const keys = new Set<string>();
    for (const r of refs) {
      keys.add(obligationKey(r.kind as ObligationTypeValue, r.id));
      if (r.kind === 'OCCUPANCY' && r.reservationId) keys.add(obligationKey(ObligationType.RESERVATION, r.reservationId));
    }
    const rows = await this.payments.find({ where: { obligationKey: In([...keys]) }, order: { createdAt: 'DESC' } });
    const best = new Map<string, Payment>();
    for (const p of rows) {
      const current = best.get(p.obligationKey);
      if (!current || rank(p.status) > rank(current.status)) best.set(p.obligationKey, p);
    }

    for (const r of refs) {
      const own = best.get(obligationKey(r.kind as ObligationTypeValue, r.id));
      const billed = r.billedAmountCents ?? null;
      let covered = 0;
      if (r.kind === 'OCCUPANCY' && r.reservationId) {
        const res = best.get(obligationKey(ObligationType.RESERVATION, r.reservationId));
        if (res?.status === PaymentStatus.APPROVED) covered = billed != null ? Math.min(billed, res.amountCents) : res.amountCents;
      }
      let summary: PaymentSummary;
      if (own) {
        summary = {
          status: own.status,
          method: own.method,
          amountCents: own.amountCents,
          billedAmountCents: own.billedAmountCents,
          coveredAmountCents: own.coveredAmountCents,
          paymentId: own.id,
          updatedAt: own.updatedAt,
        };
      } else if (covered > 0 && billed != null && billed - covered <= 0) {
        summary = { status: 'COVERED', method: null, amountCents: 0, billedAmountCents: billed, coveredAmountCents: covered, paymentId: null, updatedAt: null };
      } else {
        summary = {
          status: 'NONE',
          method: null,
          amountCents: billed != null ? Math.max(0, billed - covered) : null,
          billedAmountCents: billed,
          coveredAmountCents: covered,
          paymentId: null,
          updatedAt: null,
        };
      }
      result.set(`${r.kind}:${r.id}`, summary);
    }
    return result;
  }

  // ======================================================== helpers compartidos

  /**
   * Deja la obligación libre para un nuevo pago. Rechaza si ya está pagada o si
   * hay un checkout de Mercado Pago vigente. Los intentos vencidos se cancelan.
   */
  async releaseObligation(manager: EntityManager, key: string, source: PaymentEventSource): Promise<void> {
    const active = await manager.find(Payment, {
      where: { obligationKey: key, status: In(ACTIVE_STATUSES) },
      lock: { mode: 'pessimistic_write' },
    });
    const now = Date.now();
    for (const p of active) {
      if (p.status === PaymentStatus.APPROVED) {
        throw new ConflictException({ code: PaymentErrorCode.ALREADY_PAID, message: 'Esta operación ya fue pagada' });
      }
      if (p.expiresAt && p.expiresAt.getTime() <= now) {
        p.status = PaymentStatus.CANCELLED;
        p.statusDetail = 'expired';
        await manager.save(p);
        await this.logEvent(manager, p.id, source, 'CANCELLED_EXPIRED', {});
        continue;
      }
      throw new ConflictException({
        code: PaymentErrorCode.PAYMENT_IN_PROGRESS,
        message: 'Hay un pago con Mercado Pago en curso para esta operación. Esperá a que termine o cancelalo.',
        paymentId: p.id,
      });
    }
  }

  newPayment(obligation: Obligation, fields: Partial<Payment>): Payment {
    return this.payments.create({
      parkingLotId: obligation.parkingLotId,
      obligationType: obligation.type,
      reservationId: obligation.reservationId,
      occupancyId: obligation.occupancyId,
      obligationKey: obligation.key,
      vehiclePlate: obligation.vehiclePlate,
      concept: obligation.concept.slice(0, 200),
      billedAmountCents: obligation.billedAmountCents,
      coveredAmountCents: obligation.coveredAmountCents,
      amountCents: obligation.amountCents,
      currency: WALLET_CURRENCY,
      statusDetail: null,
      externalPaymentId: null,
      externalPreferenceId: null,
      checkoutUrl: null,
      expiresAt: null,
      approvedAt: null,
      registeredByUserId: null,
      ...fields,
    });
  }

  async logEvent(
    manager: EntityManager,
    paymentId: string | null,
    source: PaymentEventSource,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    // jsonb: TypeORM no tipa bien Record<string, unknown> en insert
    await manager.insert(PaymentEvent, { paymentId, source, event, data: data as any });
  }

  /** Convierte la violación del índice único (carrera entre dos pagos) en un 409 claro */
  async runUnique<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).driverError?.code === '23505') {
        throw new ConflictException({
          code: PaymentErrorCode.PAYMENT_IN_PROGRESS,
          message: 'La operación ya tiene un pago en curso o aprobado',
        });
      }
      throw err;
    }
  }

  async toView(payment: Payment): Promise<PaymentView> {
    const [lot] = await this.dataSource.query(`SELECT name FROM parking_lots WHERE id = $1`, [payment.parkingLotId]);
    return this.viewOf(payment, lot?.name ?? null);
  }

  viewOf(p: Payment, parkingLotName: string | null): PaymentView {
    return {
      id: p.id,
      obligationType: p.obligationType,
      reservationId: p.reservationId,
      occupancyId: p.occupancyId,
      parkingLotId: p.parkingLotId,
      parkingLotName,
      vehiclePlate: p.vehiclePlate,
      concept: p.concept,
      billedAmountCents: p.billedAmountCents,
      coveredAmountCents: p.coveredAmountCents,
      amountCents: p.amountCents,
      currency: p.currency,
      method: p.method,
      status: p.status,
      statusDetail: p.statusDetail,
      externalPaymentId: p.externalPaymentId,
      expiresAt: p.expiresAt,
      approvedAt: p.approvedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}

function rank(status: PaymentStatusValue): number {
  if (status === PaymentStatus.APPROVED) return 3;
  if (status === PaymentStatus.PENDING) return 2;
  return 1; // REJECTED / CANCELLED: el más reciente (orden DESC) queda primero
}
