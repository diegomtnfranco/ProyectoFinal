import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Payment } from './entities/payment.entity';
import { PaymentEvent } from './entities/payment-event.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ObligationResolverService } from './obligation-resolver.service';
import { ParkingAccessService } from './parking-access.service';
import { PaymentNotifierService } from './payment-notifier.service';
import { MercadoPagoClient } from './mercadopago/mercadopago.client';
import { MercadoPagoService } from './mercadopago/mercadopago.service';
import { MercadoPagoWebhookController } from './mercadopago/mercadopago-webhook.controller';

/**
 * Billetera demo + pagos (wallet, Mercado Pago Sandbox, presencial).
 * Solo agrega tablas nuevas; lee reservas/ocupaciones sin modificarlas.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletTransaction, Payment, PaymentEvent]), UserNotificationsModule],
  controllers: [WalletController, PaymentsController, MercadoPagoWebhookController],
  providers: [
    WalletService,
    PaymentsService,
    ObligationResolverService,
    ParkingAccessService,
    PaymentNotifierService,
    MercadoPagoClient,
    MercadoPagoService,
  ],
  exports: [PaymentsService, ParkingAccessService, WalletService, ObligationResolverService, PaymentNotifierService],
})
export class PaymentsModule {}
