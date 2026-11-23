import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, LessThan, Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { ObligationResolverService } from '../obligation-resolver.service';
import { PaymentNotifierService } from '../payment-notifier.service';
import { PaymentsService, PaymentView } from '../payments.service';
import { centsToPesosNumber } from '../money.util';
import {
  ACTIVE_STATUSES,
  ObligationTypeValue,
  PaymentErrorCode,
  PaymentMethod,
  PaymentStatus,
  PaymentStatusValue,
} from '../payments.constants';
import { MercadoPagoApiError, MercadoPagoClient, MpPayment } from './mercadopago.client';
import { isMercadoPagoEnabled, mercadoPagoConfig } from './mercadopago.config';
import { verifyMercadoPagoSignature } from './mercadopago.signature';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Estados de /v1/payments -> estado financiero de EstacionApp */
export function mapMercadoPagoStatus(status: string | undefined): PaymentStatusValue | null {
  switch (status) {
    case 'approved':
      return PaymentStatus.APPROVED;
    case 'pending':
    case 'in_process':
    case 'authorized':
    case 'in_mediation':
      return PaymentStatus.PENDING;
    case 'rejected':
      return PaymentStatus.REJECTED;
    case 'cancelled':
      return PaymentStatus.CANCELLED;
    default:
      return null; // refunded / charged_back: fuera de alcance (sin reembolsos), solo se audita
  }
}

export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  body: any;
}

/**
 * Checkout Pro en modo Sandbox.
 * - El importe sale siempre de la obligación (backend), nunca del frontend.
 * - La URL de retorno del navegador NO confirma pagos: solo el webhook firmado
 *   o una consulta del backend a la API de Mercado Pago cambian el estado.
 */
@Injectable()
export class MercadoPagoService implements OnModuleInit {
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor(
    @InjectRepository(Payment) private readonly paymentsRepo: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly payments: PaymentsService,
    private readonly resolver: ObligationResolverService,
    private readonly client: MercadoPagoClient,
    private readonly notifier: PaymentNotifierService,
  ) {}

  onModuleInit() {
    const cfg = mercadoPagoConfig();
    if (!cfg.sandbox) {
      this.logger.warn('MP_SANDBOX no es "true": los pagos con Mercado Pago quedan deshabilitados (solo se permite Sandbox).');
    } else if (!cfg.accessToken) {
      this.logger.log('Mercado Pago no configurado (MP_ACCESS_TOKEN vacío): la opción queda deshabilitada.');
    } else {
      if (!cfg.webhookSecret) this.logger.warn('MP_WEBHOOK_SECRET vacío: los webhooks se rechazarán; el estado se actualizará por consulta.');
      if (!cfg.notificationUrl) this.logger.warn('MP_NOTIFICATION_URL vacío: Mercado Pago no enviará webhooks a este backend.');
    }
  }

  isEnabled(): boolean {
    return isMercadoPagoEnabled();
  }

  // =========================================================== inicio del checkout

  async start(userId: string, type: ObligationTypeValue, id: string) {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException({ code: PaymentErrorCode.MP_DISABLED, message: 'Mercado Pago no está disponible' });
    }
    const cfg = mercadoPagoConfig();

    const { payment, reused } = await this.payments.runUnique(() =>
      this.dataSource.transaction(async (manager) => {
        const obligation = await this.resolver.resolve(manager, type, id);
        this.resolver.assertPayer(obligation, userId);
        this.resolver.assertSomethingToPay(obligation);

        // Si el mismo cliente ya tiene un checkout vigente, se reutiliza (doble clic, recarga)
        const pending = await manager.findOne(Payment, {
          where: { obligationKey: obligation.key, status: PaymentStatus.PENDING },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          pending &&
          pending.method === PaymentMethod.MERCADO_PAGO &&
          pending.payerUserId === userId &&
          pending.checkoutUrl &&
          pending.amountCents === obligation.amountCents &&
          pending.expiresAt &&
          pending.expiresAt.getTime() > Date.now() + 60_000
        ) {
          return { payment: pending, reused: true };
        }

        await this.payments.releaseObligation(manager, obligation.key, 'MP_CHECKOUT');
        const created = await manager.save(
          this.payments.newPayment(obligation, {
            payerUserId: userId,
            method: PaymentMethod.MERCADO_PAGO,
            status: PaymentStatus.PENDING,
            expiresAt: new Date(Date.now() + cfg.ttlMinutes * 60_000),
          }),
        );
        await this.payments.logEvent(manager, created.id, 'MP_CHECKOUT', 'CREATED', { amountCents: created.amountCents });
        return { payment: created, reused: false };
      }),
    );

    if (reused) {
      return { paymentId: payment.id, redirectUrl: payment.checkoutUrl!, expiresAt: payment.expiresAt, reused: true };
    }

    try {
      const preference = await this.client.createPreference({
        paymentId: payment.id,
        title: payment.concept,
        unitPrice: centsToPesosNumber(payment.amountCents),
        expiresAt: payment.expiresAt!,
        backUrl: `${cfg.frontendUrl}/client/payments/result?paymentId=${payment.id}`,
        notificationUrl: cfg.notificationUrl || null,
      });
      const useSandboxPoint = cfg.accessToken.startsWith('TEST-');
      const redirectUrl = useSandboxPoint
        ? (preference.sandbox_init_point ?? preference.init_point)
        : (preference.init_point ?? preference.sandbox_init_point);
      if (!preference.id || !redirectUrl) throw new MercadoPagoApiError('Respuesta de preferencia incompleta', 502);

      payment.externalPreferenceId = String(preference.id);
      payment.checkoutUrl = redirectUrl;
      await this.paymentsRepo.update(payment.id, { externalPreferenceId: payment.externalPreferenceId, checkoutUrl: redirectUrl });
      await this.payments.logEvent(this.dataSource.manager, payment.id, 'MP_CHECKOUT', 'PREFERENCE_CREATED', {
        preferenceId: preference.id,
      });
      return { paymentId: payment.id, redirectUrl, expiresAt: payment.expiresAt, reused: false };
    } catch (err) {
      // El intento no llegó a Mercado Pago: se libera la obligación
      await this.paymentsRepo.update(payment.id, { status: PaymentStatus.CANCELLED, statusDetail: 'preference_error' });
      await this.payments.logEvent(this.dataSource.manager, payment.id, 'MP_CHECKOUT', 'PREFERENCE_ERROR', {
        message: (err as Error).message,
      });
      this.logger.error(`No se pudo crear la preferencia del pago ${payment.id}: ${(err as Error).message}`);
      throw new BadGatewayException('No se pudo iniciar el pago con Mercado Pago. Probá de nuevo o pagá con tu saldo.');
    }
  }

  // =========================================================== webhook

  async handleWebhook(req: WebhookRequest) {
    const header = (name: string) => {
      const value = req.headers[name];
      return Array.isArray(value) ? value[0] : value;
    };
    const type = String(req.query['type'] ?? req.query['topic'] ?? req.body?.type ?? '');
    const dataId = String(req.query['data.id'] ?? req.body?.data?.id ?? '');
    const cfg = mercadoPagoConfig();

    const valid = verifyMercadoPagoSignature({
      xSignature: header('x-signature'),
      xRequestId: header('x-request-id'),
      dataId,
      secret: cfg.webhookSecret,
    });
    if (!valid) {
      await this.payments.logEvent(this.dataSource.manager, null, 'MP_WEBHOOK', cfg.webhookSecret ? 'INVALID_SIGNATURE' : 'SECRET_NOT_CONFIGURED', {
        type,
        dataId,
        requestId: header('x-request-id') ?? null,
      });
      this.logger.warn(`Webhook de Mercado Pago rechazado (firma inválida o sin clave). data.id=${dataId}`);
      throw new UnauthorizedException('Firma inválida');
    }

    if (type !== 'payment' || !dataId) {
      await this.payments.logEvent(this.dataSource.manager, null, 'MP_WEBHOOK', 'IGNORED_TOPIC', { type, dataId });
      return { received: true, ignored: true };
    }
    if (!this.isEnabled()) return { received: true, ignored: true };

    await this.processExternalPayment(dataId, 'MP_WEBHOOK');
    return { received: true };
  }

  /**
   * Consulta el pago a la API de Mercado Pago y aplica el estado.
   * Idempotente: repetir la misma notificación no genera cambios ni duplicados.
   */
  async processExternalPayment(mpPaymentId: string, source: 'MP_WEBHOOK' | 'MP_SYNC'): Promise<Payment | null> {
    const mp = await this.client.getPayment(mpPaymentId);
    return this.applyExternalPayment(mp, source);
  }

  async applyExternalPayment(mp: MpPayment, source: 'MP_WEBHOOK' | 'MP_SYNC'): Promise<Payment | null> {
    const mpId = String(mp.id);
    const reference = mp.external_reference ?? '';
    const audit = {
      mpPaymentId: mpId,
      mpStatus: mp.status,
      mpStatusDetail: mp.status_detail ?? null,
      liveMode: mp.live_mode ?? null,
      amount: mp.transaction_amount ?? null,
      currency: mp.currency_id ?? null,
    };
    if (!UUID_RE.test(reference)) {
      await this.payments.logEvent(this.dataSource.manager, null, source, 'UNKNOWN_REFERENCE', { ...audit, reference });
      return null;
    }

    const outcome = await this.payments.runUnique(() =>
      this.dataSource.transaction(async (manager) => {
        const payment = await manager.findOne(Payment, { where: { id: reference }, lock: { mode: 'pessimistic_write' } });
        if (!payment || payment.method !== PaymentMethod.MERCADO_PAGO) {
          await this.payments.logEvent(manager, null, source, 'UNKNOWN_PAYMENT', { ...audit, reference });
          return { payment: null, changed: false };
        }
        const log = (event: string, extra: Record<string, unknown> = {}) =>
          this.payments.logEvent(manager, payment.id, source, event, { ...audit, ...extra });

        // Validación de importe y moneda contra lo guardado al crear el pago
        const amountOk =
          typeof mp.transaction_amount === 'number' &&
          Math.round(mp.transaction_amount * 100) === payment.amountCents &&
          (mp.currency_id ?? 'ARS') === 'ARS';
        if (!amountOk) {
          await log('AMOUNT_MISMATCH', { expectedCents: payment.amountCents });
          this.logger.error(`Importe distinto en Mercado Pago para el pago ${payment.id} (mp ${mpId}). No se aplica.`);
          return { payment, changed: false };
        }

        // Solo dinero ficticio: un pago real (live_mode = true) nunca se aplica
        if (mp.live_mode === true) {
          await log('LIVE_MODE_REJECTED');
          this.logger.error(`Pago real (live_mode) recibido para ${payment.id} (mp ${mpId}). Solo se admite Sandbox; no se aplica.`);
          return { payment, changed: false };
        }

        const mapped = mapMercadoPagoStatus(mp.status);
        if (!mapped) {
          await log('UNHANDLED_STATUS');
          return { payment, changed: false };
        }

        if (payment.status === PaymentStatus.APPROVED) {
          const otherApproval = mapped === PaymentStatus.APPROVED && payment.externalPaymentId !== mpId;
          await log(otherApproval ? 'DUPLICATE_EXTERNAL' : 'REPEATED_NOTIFICATION');
          if (otherApproval) this.logger.error(`Segundo pago aprobado en Mercado Pago (${mpId}) para el pago ${payment.id}.`);
          return { payment, changed: false };
        }
        if (mapped === payment.status && payment.externalPaymentId === mpId) {
          await log('REPEATED_NOTIFICATION');
          return { payment, changed: false };
        }

        // Aprobación tardía de un intento rechazado/cancelado
        if (mapped === PaymentStatus.APPROVED && payment.status !== PaymentStatus.PENDING) {
          const active = await manager.find(Payment, {
            where: { obligationKey: payment.obligationKey, status: In(ACTIVE_STATUSES) },
            lock: { mode: 'pessimistic_write' },
          });
          const approvedOther = active.find((p) => p.status === PaymentStatus.APPROVED && p.id !== payment.id);
          if (approvedOther) {
            payment.statusDetail = 'approved_duplicate';
            await manager.save(payment);
            await log('DUPLICATE_EXTERNAL', { otherPaymentId: approvedOther.id });
            this.logger.error(
              `Pago ${payment.id} aprobado en Mercado Pago pero la obligación ya estaba pagada (${approvedOther.id}). Revisar manualmente.`,
            );
            return { payment, changed: false };
          }
          for (const other of active.filter((p) => p.id !== payment.id)) {
            other.status = PaymentStatus.CANCELLED;
            other.statusDetail = 'superseded';
            await manager.save(other);
            await this.payments.logEvent(manager, other.id, source, 'CANCELLED_SUPERSEDED', { by: payment.id });
          }
        }

        if (payment.status === PaymentStatus.PENDING || mapped === PaymentStatus.APPROVED) {
          payment.status = mapped;
          payment.statusDetail = mp.status_detail ? String(mp.status_detail).slice(0, 80) : null;
          payment.externalPaymentId = mpId;
          if (mapped === PaymentStatus.APPROVED) {
            payment.approvedAt = mp.date_approved ? new Date(mp.date_approved) : new Date();
          }
          await manager.save(payment);
          await log(`STATUS_${mapped}`);
          return { payment, changed: true };
        }

        await log('IGNORED_TRANSITION', { currentStatus: payment.status });
        return { payment, changed: false };
      }),
    );

    if (outcome.changed && outcome.payment) void this.notifier.notifyStatus(outcome.payment);
    return outcome.payment;
  }

  // =========================================================== acciones del cliente

  /** Reconsulta el estado a Mercado Pago desde el backend (página de retorno) */
  async sync(userId: string, paymentId: string): Promise<PaymentView> {
    const payment = await this.paymentsRepo.findOne({ where: { id: paymentId, payerUserId: userId } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.method === PaymentMethod.MERCADO_PAGO && this.isEnabled()) {
      try {
        await this.syncWithProvider(payment.id);
      } catch (err) {
        this.logger.warn(`No se pudo consultar Mercado Pago para ${payment.id}: ${(err as Error).message}`);
      }
    }
    return this.payments.getMine(userId, paymentId);
  }

  async cancel(userId: string, paymentId: string): Promise<PaymentView> {
    let payment = await this.paymentsRepo.findOne({ where: { id: paymentId, payerUserId: userId } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.method !== PaymentMethod.MERCADO_PAGO || payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException('Solo se puede cancelar un pago pendiente de Mercado Pago');
    }
    if (this.isEnabled()) {
      try {
        await this.syncWithProvider(payment.id);
      } catch (err) {
        this.logger.warn(`No se pudo consultar Mercado Pago antes de cancelar ${payment.id}: ${(err as Error).message}`);
      }
    }
    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOneOrFail(Payment, { where: { id: paymentId }, lock: { mode: 'pessimistic_write' } });
      if (locked.status !== PaymentStatus.PENDING) return;
      if (locked.externalPaymentId) {
        throw new ConflictException('Mercado Pago está procesando este pago; no se puede cancelar');
      }
      locked.status = PaymentStatus.CANCELLED;
      locked.statusDetail = 'cancelled_by_user';
      await manager.save(locked);
      await this.payments.logEvent(manager, locked.id, 'SYSTEM', 'CANCELLED_BY_USER', {});
      payment = locked;
    });
    return this.payments.getMine(userId, paymentId);
  }

  /** Busca los pagos de Mercado Pago de esta preferencia y aplica el más relevante */
  private async syncWithProvider(paymentId: string): Promise<void> {
    const results = await this.client.searchByExternalReference(paymentId);
    if (!results.length) return;
    // 1) Aprobados primero: se aplican de a uno (los que no validan importe se descartan solos)
    for (const r of results.filter((x) => x.status === 'approved')) {
      const applied = await this.applyExternalPayment(r, 'MP_SYNC');
      if (applied?.status === PaymentStatus.APPROVED) return;
    }
    // 2) Si no hay aprobación: el pendiente más reciente o, si no, el último intento
    const next = results.find((r) => mapMercadoPagoStatus(r.status) === PaymentStatus.PENDING) ?? results[0];
    if (next.status !== 'approved') await this.applyExternalPayment(next, 'MP_SYNC');
  }

  // =========================================================== vencimientos

  /** Cada 5 minutos: cierra los checkouts vencidos que nunca llegaron a pagarse */
  @Cron('0 */5 * * * *')
  async expireStalePending(): Promise<void> {
    const stale = await this.paymentsRepo.find({
      where: {
        method: PaymentMethod.MERCADO_PAGO,
        status: PaymentStatus.PENDING,
        externalPaymentId: IsNull(),
        expiresAt: LessThan(new Date(Date.now() - 2 * 60_000)),
      },
      take: 50,
    });
    for (const p of stale) {
      try {
        if (this.isEnabled()) await this.syncWithProvider(p.id);
        await this.dataSource.transaction(async (manager) => {
          const locked = await manager.findOneOrFail(Payment, { where: { id: p.id }, lock: { mode: 'pessimistic_write' } });
          if (locked.status !== PaymentStatus.PENDING || locked.externalPaymentId) return;
          locked.status = PaymentStatus.CANCELLED;
          locked.statusDetail = 'expired';
          await manager.save(locked);
          await this.payments.logEvent(manager, locked.id, 'SYSTEM', 'CANCELLED_EXPIRED', {});
        });
      } catch (err) {
        this.logger.warn(`No se pudo cerrar el pago vencido ${p.id}: ${(err as Error).message}`);
      }
    }
  }
}
