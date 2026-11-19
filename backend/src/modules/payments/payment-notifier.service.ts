import { Injectable, Logger, Optional } from '@nestjs/common';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';
import { NotificationType } from '../user-notifications/user-notifications.constants';
import { Payment } from './entities/payment.entity';
import { formatArs } from './money.util';
import { PaymentMethod, PaymentStatus } from './payments.constants';

const METHOD_LABEL: Record<string, string> = {
  [PaymentMethod.WALLET]: 'Billetera EstacionApp',
  [PaymentMethod.MERCADO_PAGO]: 'Mercado Pago',
  [PaymentMethod.PRESENTIAL]: 'Pago presencial',
};

/**
 * Reutiliza el centro de notificaciones existente. Nunca lanza: una
 * notificación fallida no puede revertir ni bloquear un pago.
 */
@Injectable()
export class PaymentNotifierService {
  private readonly logger = new Logger(PaymentNotifierService.name);

  constructor(@Optional() private readonly notifications?: UserNotificationsService) {}

  async notifyStatus(payment: Payment): Promise<void> {
    if (!this.notifications || !payment.payerUserId) return;
    const amount = formatArs(payment.amountCents);
    const method = METHOD_LABEL[payment.method] ?? payment.method;
    const base = {
      dedupeKey: `payment:${payment.id}:${payment.status}`,
      data: { paymentId: payment.id, status: payment.status, method: payment.method, amountCents: payment.amountCents },
      link: '/client/wallet?tab=payments',
      relatedEntityType: 'payment',
      relatedEntityId: payment.id,
    };
    try {
      if (payment.status === PaymentStatus.APPROVED) {
        await this.notifications.notifyUsers([payment.payerUserId], {
          ...base,
          type: NotificationType.PAYMENT_APPROVED,
          title: 'Pago aprobado',
          message: `${payment.concept}: ${amount} con ${method}.`,
        });
      } else if (payment.status === PaymentStatus.REJECTED) {
        await this.notifications.notifyUsers([payment.payerUserId], {
          ...base,
          type: NotificationType.PAYMENT_REJECTED,
          title: 'Pago rechazado',
          message: `${payment.concept}: el pago de ${amount} con ${method} fue rechazado.`,
        });
      } else if (payment.status === PaymentStatus.PENDING && payment.externalPaymentId) {
        // Solo cuando Mercado Pago informa un pago en proceso (no al iniciar el checkout)
        await this.notifications.notifyUsers([payment.payerUserId], {
          ...base,
          type: NotificationType.PAYMENT_PENDING,
          title: 'Pago pendiente',
          message: `${payment.concept}: Mercado Pago está procesando el pago de ${amount}.`,
        });
      }
    } catch (err) {
      this.logger.warn(`No se pudo notificar el pago ${payment.id}: ${(err as Error).message}`);
    }
  }
}
