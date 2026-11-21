import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Occupancy } from '../entities/occupancy.entity';
import { CheckOutDto } from '../dto/check-out.dto';
import { FinalCharge, OccupancyService } from '../occupancy.service';
import { ParkingLotsService } from '../../parking-lots/parking-lots.service';
import { RatesService } from '../../rates/rates.service';
import { VehicleType } from '../../common/enums/vehicle-type.enum';
import { UserRole } from '../../users/entities/user.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { PaymentsService } from '../../payments/payments.service';
import { WalletService } from '../../payments/wallet.service';
import { ObligationResolverService } from '../../payments/obligation-resolver.service';
import { PaymentNotifierService } from '../../payments/payment-notifier.service';
import {
  ParkingAccessService,
  Requester,
} from '../../payments/parking-access.service';
import { decimalToCents, formatArs } from '../../payments/money.util';
import {
  ObligationType,
  PaymentMethod,
  PaymentStatus,
} from '../../payments/payments.constants';
import { UserNotificationsService } from '../../user-notifications/user-notifications.service';
import { NotificationType } from '../../user-notifications/user-notifications.constants';
import { TrackingNotifierService } from '../../tracking-notifier/tracking-notifier.service';
import {
  hasClientVehicle,
  VEHICLE_REQUIRED_CODE,
} from '../../client-vehicles/vehicle-required.guard';
import { CheckoutRequest } from './entities/checkout-request.entity';
import {
  CheckoutErrorCode,
  CheckoutEvents,
  CheckoutRequestMethod,
  CheckoutRequestStatus,
  CheckoutRequestStatusValue,
} from './checkout.constants';

const VEHICLE_LABEL: Record<string, string> = {
  car: 'Auto',
  motorcycle: 'Moto',
  truck: 'Camioneta',
  van: 'Utilitario',
  bicycle: 'Bicicleta',
};

/** Vehículo del cliente identificado en una ocupación activa */
interface MatchRow {
  occupancy_id: string;
  vehicle_id: string;
  vehicle_name: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
}

export interface CashRequestView {
  id: string;
  status: CheckoutRequestStatusValue;
  occupancyId: string;
  parkingLotId: string;
  vehiclePlate: string | null;
  quotedAmountCents: number;
  mine: boolean;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface CheckoutQuote {
  occupancyId: string;
  vehiclePlate: string;
  vehicleType: string;
  vehicle: {
    id: string;
    name: string | null;
    brand: string | null;
    model: string | null;
  } | null;
  space: { id: string; spaceNumber: string; floor: number | null };
  checkInTime: Date;
  hoursToCharge: number;
  billedAmountCents: number;
  coveredAmountCents: number;
  amountCents: number;
  breakdown: FinalCharge['breakdown'] | null;
  cashRequest: CashRequestView | null;
}

/**
 * Egreso con pago:
 *  - Cliente por QR (autenticado): identificación por las patentes de su perfil,
 *    cotización, pago con billetera atómico (egreso + débito) y solicitud de efectivo.
 *  - Dueño/empleado: egreso con "pago recibido presencialmente" o con el pago pendiente.
 *
 * El importe SIEMPRE lo calcula el backend (OccupancyService.computeFinalCharge).
 */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly occupancies: OccupancyService,
    private readonly parkingLots: ParkingLotsService,
    private readonly payments: PaymentsService,
    private readonly wallet: WalletService,
    private readonly resolver: ObligationResolverService,
    private readonly paymentNotifier: PaymentNotifierService,
    private readonly access: ParkingAccessService,
    private readonly rates: RatesService,
    @Optional() private readonly notifications?: UserNotificationsService,
    @Optional() private readonly realtime?: TrackingNotifierService,
  ) {}

  // ================================================================ cliente: QR

  /**
   * Ingreso por QR: vehículos del perfil del cliente (nunca de otros usuarios)
   * con lo necesario para elegir. Si el vehículo ya tiene un ingreso activo o el
   * estacionamiento no tiene tarifa para su tipo, se informa y no se puede elegir.
   */
  async checkInOptions(userId: string, token: string) {
    const lot = await this.parkingLots.validateQRToken(token, 'check-in');
    await this.assertHasVehicle(userId);
    const vehicles = await this.myVehicles(userId);
    const now = new Date();
    const items: Record<string, unknown>[] = [];
    for (const v of vehicles) {
      const rate = await this.rates.findApplicableRate(
        lot.id,
        v.vehicle_type,
        now,
      );
      items.push({
        id: v.id,
        plate: v.plate,
        vehicleType: v.vehicle_type,
        name: v.name,
        brand: v.brand,
        model: v.model,
        parkedAt: v.parked_lot_name, // ingreso activo (en cualquier estacionamiento)
        hasRate: !!rate,
        pricePerHour: rate ? Number(rate.pricePerHour) : null,
        available: !v.parked_lot_name && !!rate,
      });
    }
    return {
      parkingLot: { id: lot.id, name: lot.name, address: lot.address },
      vehicles: items,
    };
  }

  /**
   * Ingreso por QR con un vehículo del perfil. La patente y el tipo salen del
   * vehículo registrado (el cliente no los escribe): así coinciden con lo que ve
   * el personal en su panel y la tarifa se aplica según ese tipo.
   */
  async clientQrCheckIn(
    userId: string,
    dto: { token: string; vehicleId: string; serviceKeys?: string[] },
  ) {
    await this.parkingLots.validateQRToken(dto.token, 'check-in');
    await this.assertHasVehicle(userId);
    const [vehicle] = (await this.myVehicles(userId)).filter(
      (v) => v.id === dto.vehicleId,
    );
    if (!vehicle) {
      throw new ForbiddenException({
        code: CheckoutErrorCode.VEHICLE_NOT_OWNED,
        message: 'Ese vehículo no está registrado en tu perfil',
      });
    }
    if (vehicle.parked_lot_name) {
      throw new ConflictException({
        code: CheckoutErrorCode.VEHICLE_ALREADY_PARKED,
        message: `El vehículo ${vehicle.plate} ya tiene un ingreso activo en ${vehicle.parked_lot_name}`,
      });
    }
    const result = await this.occupancies.anonymousCheckIn(
      {
        token: dto.token,
        // Misma forma que el resto de los ingresos por QR (solo letras y números)
        vehiclePlate: vehicle.plate_normalized,
        vehicleType: vehicle.vehicle_type,
        serviceKeys: dto.serviceKeys,
      },
      { isAnonymous: false },
    );
    return {
      ...result,
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        vehicleType: vehicle.vehicle_type,
        name: vehicle.name,
        brand: vehicle.brand,
        model: vehicle.model,
      },
    };
  }

  /** Identifica los vehículos del cliente estacionados en el estacionamiento del QR y cotiza cada uno */
  async quoteForClient(userId: string, token: string) {
    const lot = await this.parkingLots.validateQRToken(token, 'check-out');
    await this.assertHasVehicle(userId);
    const manager = this.dataSource.manager;
    const rows = await this.findMatches(manager, userId, lot.id);

    const matches: CheckoutQuote[] = [];
    for (const row of rows) {
      const occupancy = await this.loadOccupancy(manager, row.occupancy_id);
      if (!occupancy || occupancy.isCompleted) continue;
      matches.push(await this.buildQuote(manager, occupancy, row, userId));
    }
    const wallet = await this.wallet.getOrCreate(userId);

    return {
      parkingLot: { id: lot.id, name: lot.name, address: lot.address },
      matches,
      wallet: { balanceCents: wallet.balanceCents, currency: wallet.currency },
      methods: {
        wallet: { enabled: true },
        // Fuera de alcance: integración real en una feature independiente
        mercadoPago: { enabled: false, comingSoon: true },
        cash: { enabled: true },
      },
    };
  }

  /**
   * Pago con billetera + egreso en UNA transacción: si el débito o el egreso
   * fallan, no se cobra ni se libera el espacio. Idempotente por Idempotency-Key.
   */
  async payWithWallet(
    userId: string,
    dto: { token: string; occupancyId: string; expectedAmountCents: number },
    idempotencyKey: string | null,
  ) {
    const lot = await this.parkingLots.validateQRToken(dto.token, 'check-out');
    await this.assertHasVehicle(userId);
    const { id: walletId } = await this.wallet.getOrCreate(userId);

    const result = await this.payments.runUnique(() =>
      this.dataSource.transaction(async (manager) => {
        // 1. La billetera se bloquea primero (mismo orden que PaymentsService.payWithWallet)
        const wallet = await this.wallet.lock(manager, walletId);

        // 2. Reintento con la misma clave: devolver el resultado original sin cobrar otra vez
        if (idempotencyKey) {
          const [repeated] = await manager.query(
            `SELECT payment_id FROM wallet_transactions WHERE wallet_id = $1 AND idempotency_key = $2`,
            [walletId, idempotencyKey],
          );
          if (repeated?.payment_id) {
            const payment = await manager.findOneOrFail(Payment, {
              where: { id: repeated.payment_id },
            });
            return {
              replayed: true as const,
              payment,
              occupancy: null,
              space: null,
              charge: null,
              request: null,
              balanceCents: wallet.balanceCents,
            };
          }
        }

        // 3. Estadía activa, en este estacionamiento y con una patente del perfil del cliente
        const { occupancy } = await this.lockOwnedActiveOccupancy(
          manager,
          userId,
          lot.id,
          dto.occupancyId,
        );

        // 4. Importe recalculado en el backend; el del cliente solo es un control
        const at = new Date();
        const charge = await this.occupancies.computeFinalCharge(
          manager,
          occupancy,
          lot.id,
          at,
        );
        const billed = decimalToCents(charge.totalAmount) ?? 0;
        const covered = await this.resolver.reservationCoverage(
          manager,
          occupancy.reservationId,
          billed,
        );
        const amountCents = Math.max(0, billed - covered);
        if (amountCents !== dto.expectedAmountCents) {
          throw new ConflictException({
            code: CheckoutErrorCode.AMOUNT_CHANGED,
            message: 'El importe se actualizó. Revisalo y confirmá nuevamente.',
            amountCents,
          });
        }

        // 5. Egreso (dentro de la misma transacción)
        this.occupancies.applyCheckOut(occupancy, charge, at, { viaQr: true });
        await manager.save(occupancy);
        const space = await this.occupancies.releaseSpace(
          manager,
          occupancy.space,
        );

        // 6. Pago aprobado + débito (si el saldo no alcanza, se revierte el egreso)
        let payment: Payment | null = null;
        if (amountCents > 0) {
          const obligation = await this.resolver.resolve(
            manager,
            ObligationType.OCCUPANCY,
            occupancy.id,
          );
          await this.payments.releaseObligation(
            manager,
            obligation.key,
            'WALLET',
          );
          payment = await manager.save(
            this.payments.newPayment(obligation, {
              payerUserId: userId,
              method: PaymentMethod.WALLET,
              status: PaymentStatus.APPROVED,
              approvedAt: new Date(),
              statusDetail: 'qr_checkout',
            }),
          );
          await this.wallet.debitLocked(
            manager,
            wallet,
            payment.amountCents,
            payment.id,
            payment.concept,
            idempotencyKey,
          );
          await this.payments.logEvent(
            manager,
            payment.id,
            'WALLET',
            'APPROVED',
            {
              amountCents: payment.amountCents,
              via: 'qr_checkout',
            },
          );
        }

        // 7. Si había una solicitud de efectivo pendiente, queda resuelta por la billetera
        const request = await this.resolvePendingRequest(
          manager,
          occupancy.id,
          {
            status: CheckoutRequestStatus.COMPLETED_WALLET,
            by: userId,
            paymentId: payment?.id ?? null,
          },
        );

        return {
          replayed: false as const,
          payment,
          occupancy,
          space,
          charge,
          request,
          balanceCents: wallet.balanceCents,
        };
      }),
    );

    if (!result.replayed) {
      this.occupancies.afterCheckOut(
        result.occupancy,
        result.space,
        result.charge.totalAmount,
        true,
      );
      if (result.payment)
        void this.paymentNotifier.notifyStatus(result.payment);
      if (result.request) void this.emitRequestUpdated(result.request);
    }
    const payment = result.payment;
    return {
      status: payment ? 'PAID' : 'COVERED',
      replayed: result.replayed,
      occupancyId: payment?.occupancyId ?? result.occupancy?.id ?? null,
      vehiclePlate:
        payment?.vehiclePlate ?? result.occupancy?.vehiclePlate ?? null,
      amountCents: payment?.amountCents ?? 0,
      walletBalanceCents: result.balanceCents,
      payment: payment ? await this.payments.toView(payment) : null,
      checkOutTime: result.occupancy?.checkOutTime ?? null,
      spaceNumber: result.space?.spaceNumber ?? null,
    };
  }

  /**
   * Solicitud de salida pagando en efectivo. No cierra la ocupación ni libera
   * el espacio: el personal confirma el cobro y registra el egreso.
   */
  async requestCash(
    userId: string,
    dto: { token: string; occupancyId: string },
  ) {
    const lot = await this.parkingLots.validateQRToken(dto.token, 'check-out');
    await this.assertHasVehicle(userId);

    const created = await this.uniqueRequest(() =>
      this.dataSource.transaction(async (manager) => {
        const { occupancy } = await this.lockOwnedActiveOccupancy(
          manager,
          userId,
          lot.id,
          dto.occupancyId,
        );

        const existing = await manager.findOne(CheckoutRequest, {
          where: {
            occupancyId: occupancy.id,
            status: CheckoutRequestStatus.PENDING,
          },
        });
        if (existing) {
          throw new ConflictException({
            code: CheckoutErrorCode.CASH_REQUEST_EXISTS,
            message:
              'Ya hay una solicitud de pago en efectivo para este vehículo. Esperá la confirmación del personal.',
            requestId: existing.id,
          });
        }

        const charge = await this.occupancies.computeFinalCharge(
          manager,
          occupancy,
          lot.id,
          new Date(),
        );
        const billed = decimalToCents(charge.totalAmount) ?? 0;
        const covered = await this.resolver.reservationCoverage(
          manager,
          occupancy.reservationId,
          billed,
        );

        const request = await manager.save(
          manager.create(CheckoutRequest, {
            occupancyId: occupancy.id,
            parkingLotId: lot.id,
            userId,
            method: CheckoutRequestMethod.CASH,
            status: CheckoutRequestStatus.PENDING,
            quotedAmountCents: Math.max(0, billed - covered),
            vehiclePlate:
              (occupancy.vehiclePlate ?? '').toUpperCase().slice(0, 15) || null,
            resolvedByUserId: null,
            resolvedAt: null,
            paymentId: null,
          }),
        );
        return { request, occupancy };
      }),
    );

    void this.notifyStaffCashRequested(created.request, created.occupancy);
    return this.requestView(created.request, userId);
  }

  /** Estado de una solicitud propia (respaldo de la actualización en tiempo real) */
  async getMyRequest(userId: string, requestId: string) {
    const request = await this.dataSource.manager.findOne(CheckoutRequest, {
      where: { id: requestId, userId },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    return this.requestDetail(request, userId);
  }

  /** El cliente cancela su solicitud mientras sigue pendiente (por ejemplo, para pagar con la billetera) */
  async cancelMyRequest(userId: string, requestId: string) {
    const request = await this.dataSource.transaction(async (manager) => {
      const found = await manager.findOne(CheckoutRequest, {
        where: { id: requestId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!found) throw new NotFoundException('Solicitud no encontrada');
      if (found.status !== CheckoutRequestStatus.PENDING) {
        throw new ConflictException('La solicitud ya no está pendiente');
      }
      found.status = CheckoutRequestStatus.CANCELLED;
      found.resolvedByUserId = userId;
      found.resolvedAt = new Date();
      return manager.save(found);
    });
    void this.emitRequestUpdated(request);
    return this.requestDetail(request, userId);
  }

  // ================================================================ dueño / empleado

  /**
   * Egreso desde el dashboard. Con `paymentReceived` registra el cobro
   * presencial (PRESENTIAL aprobado) en la misma transacción; sin él, el
   * egreso se completa y el pago queda pendiente (no se registra como cobrado).
   */
  async staffCheckOut(dto: CheckOutDto, user: Requester) {
    // Administradores: sin cambios funcionales en esta feature
    if (user.role === UserRole.ADMIN) {
      return this.occupancies.checkOut(
        { spaceId: dto.spaceId },
        user.id,
        user.role,
      );
    }
    await this.assertSpaceAccess(dto.spaceId, user);

    const paymentReceived = dto.paymentReceived === true;
    const captured: {
      payment: Payment | null;
      request: CheckoutRequest | null;
    } = { payment: null, request: null };

    const response = await this.payments.runUnique(() =>
      this.occupancies.checkOut({ spaceId: dto.spaceId }, user.id, user.role, {
        beforeCommit: async (manager, occupancy) => {
          const obligation = await this.resolver.resolve(
            manager,
            ObligationType.OCCUPANCY,
            occupancy.id,
          );
          const pending = await manager.findOne(CheckoutRequest, {
            where: {
              occupancyId: occupancy.id,
              status: CheckoutRequestStatus.PENDING,
            },
            lock: { mode: 'pessimistic_write' },
          });

          let payment: Payment | null = null;
          if (paymentReceived && obligation.amountCents > 0) {
            await this.payments.releaseObligation(
              manager,
              obligation.key,
              'PRESENTIAL',
            );
            payment = await manager.save(
              this.payments.newPayment(obligation, {
                // Quien pidió pagar en efectivo; si no hubo solicitud, el único cliente vinculado (o ninguno)
                payerUserId:
                  pending?.userId ??
                  (obligation.payerUserIds.length === 1
                    ? obligation.payerUserIds[0]
                    : null),
                method: PaymentMethod.PRESENTIAL,
                status: PaymentStatus.APPROVED,
                approvedAt: new Date(),
                registeredByUserId: user.id,
                statusDetail: 'cash_at_exit',
              }),
            );
            await this.payments.logEvent(
              manager,
              payment.id,
              'PRESENTIAL',
              'APPROVED',
              {
                registeredBy: user.id,
                role: user.role,
                via: 'staff_checkout',
              },
            );
          }

          const covered = obligation.amountCents <= 0;
          const request = pending
            ? await this.resolvePendingRequest(manager, occupancy.id, {
                status:
                  paymentReceived || covered
                    ? CheckoutRequestStatus.COMPLETED_PAID
                    : CheckoutRequestStatus.COMPLETED_UNPAID,
                by: user.id,
                paymentId: payment?.id ?? null,
              })
            : null;

          captured.payment = payment;
          captured.request = request;
          return {
            checkout: {
              paymentStatus: covered
                ? 'COVERED'
                : payment
                  ? 'APPROVED'
                  : 'PENDING',
              paymentReceived: !!payment,
              billedAmountCents: obligation.billedAmountCents,
              coveredAmountCents: obligation.coveredAmountCents,
              amountCents: obligation.amountCents,
              paymentId: payment?.id ?? null,
              checkoutRequestId: request?.id ?? null,
            },
          };
        },
      }),
    );

    if (captured.payment)
      void this.paymentNotifier.notifyStatus(captured.payment);
    if (captured.request) {
      void this.emitRequestUpdated(captured.request);
      if (captured.request.status === CheckoutRequestStatus.COMPLETED_UNPAID) {
        void this.notifyClientUnpaid(captured.request);
      }
    }
    return response;
  }

  /** Cotización para el personal antes de confirmar el egreso */
  async staffQuote(spaceId: string, user: Requester) {
    const lotId = await this.assertSpaceAccess(spaceId, user);
    const manager = this.dataSource.manager;
    const active = await manager.findOne(Occupancy, {
      where: { spaceId, isCompleted: false },
      relations: ['space', 'reservation', 'reservation.client'],
    });
    if (!active)
      throw new NotFoundException(
        'No hay una ocupación activa en este espacio',
      );

    const quote = await this.buildQuote(manager, active, null, null);
    const pending = quote.cashRequest
      ? await manager.findOne(CheckoutRequest, {
          where: { id: quote.cashRequest.id },
        })
      : null;
    const clientName = pending
      ? await this.clientName(pending.userId)
      : (active.reservation?.client?.name ?? null);
    return { ...quote, parkingLotId: lotId, clientName };
  }

  /** Solicitudes de efectivo pendientes del estacionamiento (badge del dashboard) */
  async listPendingForLot(parkingLotId: string, user: Requester) {
    await this.access.assertStaff(parkingLotId, user);
    const rows: any[] = await this.dataSource.query(
      `SELECT r.id, r.occupancy_id, r.vehicle_plate, r.quoted_amount_cents, r.created_at,
              o."vehicleType" AS vehicle_type, o.space_id, s.space_number, (s.metadata->>'floor') AS floor, cp.name AS client_name
         FROM checkout_requests r
         JOIN occupancies o ON o.id = r.occupancy_id
         JOIN spaces s ON s.id = o.space_id
         LEFT JOIN client_profiles cp ON cp.user_id = r.user_id
        WHERE r.parking_lot_id = $1 AND r.status = 'PENDING' AND o.is_completed = false
        ORDER BY r.created_at ASC`,
      [parkingLotId],
    );
    return rows.map((r) => ({
      id: r.id,
      occupancyId: r.occupancy_id,
      spaceId: r.space_id,
      spaceNumber: r.space_number,
      floor: r.floor != null ? Number(r.floor) : null,
      vehiclePlate: r.vehicle_plate,
      vehicleType: r.vehicle_type,
      clientName: r.client_name,
      quotedAmountCents: Number(r.quoted_amount_cents),
      createdAt: r.created_at,
    }));
  }

  /**
   * Pertenencia del dueño/empleado al estacionamiento del espacio.
   * Devuelve el id del estacionamiento. ADMIN mantiene el comportamiento previo.
   */
  async assertSpaceAccess(spaceId: string, user: Requester): Promise<string> {
    const [row] = await this.dataSource.query(
      `SELECT parking_lot_id FROM spaces WHERE id = $1`,
      [spaceId],
    );
    if (!row) throw new NotFoundException('Espacio no encontrado');
    if (user.role !== UserRole.ADMIN)
      await this.access.assertStaff(row.parking_lot_id, user);
    return row.parking_lot_id;
  }

  async assertLotAccess(parkingLotId: string, user: Requester): Promise<void> {
    if (user.role !== UserRole.ADMIN)
      await this.access.assertStaff(parkingLotId, user);
  }

  // ================================================================ helpers

  /** Vehículos ACTUALES del perfil del cliente, con el estacionamiento donde tienen un ingreso activo (si lo hay) */
  private myVehicles(userId: string): Promise<
    {
      id: string;
      plate: string;
      plate_normalized: string;
      vehicle_type: VehicleType;
      name: string | null;
      brand: string | null;
      model: string | null;
      parked_lot_name: string | null;
    }[]
  > {
    return this.dataSource.query(
      `SELECT cv.id, cv.plate, cv.plate_normalized, cv.vehicle_type, cv.name, cv.brand, cv.model,
              (SELECT pl.name FROM occupancies o
                 JOIN spaces s ON s.id = o.space_id
                 JOIN parking_lots pl ON pl.id = s.parking_lot_id
                WHERE o.is_completed = false
                  AND regexp_replace(upper(coalesce(o.vehicle_plate, '')), '[^A-Z0-9]', '', 'g') = cv.plate_normalized
                LIMIT 1) AS parked_lot_name
         FROM client_vehicles cv
         JOIN client_profiles cp ON cp.id = cv.client_profile_id
        WHERE cp.user_id = $1
        ORDER BY cv.created_at ASC`,
      [userId],
    );
  }

  private async assertHasVehicle(userId: string) {
    if (!(await hasClientVehicle(this.dataSource, userId))) {
      throw new ForbiddenException({
        code: VEHICLE_REQUIRED_CODE,
        message: 'Registrá al menos un vehículo en tu perfil para continuar',
      });
    }
  }

  /**
   * Ocupaciones activas del estacionamiento cuya patente coincide con un vehículo
   * ACTUAL del perfil del cliente (no se usan patentes históricas).
   */
  private findMatches(
    manager: EntityManager,
    userId: string,
    parkingLotId: string,
    occupancyId?: string,
  ): Promise<MatchRow[]> {
    return manager.query(
      `SELECT o.id AS occupancy_id, cv.id AS vehicle_id, cv.name AS vehicle_name,
              cv.brand AS vehicle_brand, cv.model AS vehicle_model
         FROM occupancies o
         JOIN spaces s ON s.id = o.space_id
         JOIN client_profiles cp ON cp.user_id = $1
         JOIN client_vehicles cv ON cv.client_profile_id = cp.id
          AND cv.plate_normalized = regexp_replace(upper(coalesce(o.vehicle_plate, '')), '[^A-Z0-9]', '', 'g')
        WHERE s.parking_lot_id = $2 AND o.is_completed = false
          ${occupancyId ? 'AND o.id = $3' : ''}
        ORDER BY o.check_in_time DESC`,
      occupancyId
        ? [userId, parkingLotId, occupancyId]
        : [userId, parkingLotId],
    );
  }

  /**
   * Bloquea la ocupación (FOR UPDATE) y verifica, ya con el candado tomado,
   * que siga activa, que sea de este estacionamiento y del cliente.
   */
  private async lockOwnedActiveOccupancy(
    manager: EntityManager,
    userId: string,
    parkingLotId: string,
    occupancyId: string,
  ) {
    const locked = await manager.findOne(Occupancy, {
      where: { id: occupancyId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!locked)
      throw new NotFoundException({
        code: CheckoutErrorCode.NO_MATCH,
        message: 'No encontramos ese ingreso',
      });
    if (locked.isCompleted) {
      throw new ConflictException({
        code: CheckoutErrorCode.ALREADY_CHECKED_OUT,
        message: 'Este vehículo ya registró su salida',
      });
    }
    const [match] = await this.findMatches(
      manager,
      userId,
      parkingLotId,
      occupancyId,
    );
    if (!match) {
      // Otro estacionamiento, patente de otro cliente o vehículo que ya no está en el perfil
      throw new ForbiddenException({
        code: CheckoutErrorCode.NO_MATCH,
        message:
          'Este ingreso no corresponde a un vehículo de tu perfil en este estacionamiento',
      });
    }
    const occupancy = await this.loadOccupancy(manager, occupancyId);
    if (!occupancy) throw new NotFoundException('No encontramos ese ingreso');
    return { occupancy, match };
  }

  private loadOccupancy(manager: EntityManager, id: string) {
    return manager.findOne(Occupancy, {
      where: { id },
      relations: ['space', 'space.parkingLot'],
    });
  }

  private async buildQuote(
    manager: EntityManager,
    occupancy: Occupancy,
    match: MatchRow | null,
    viewerUserId: string | null,
  ): Promise<CheckoutQuote> {
    const charge = await this.occupancies.computeFinalCharge(
      manager,
      occupancy,
      occupancy.space.parkingLotId,
      new Date(),
    );
    const billed = decimalToCents(charge.totalAmount) ?? 0;
    const covered = await this.resolver.reservationCoverage(
      manager,
      occupancy.reservationId,
      billed,
    );
    const pending = await manager.findOne(CheckoutRequest, {
      where: {
        occupancyId: occupancy.id,
        status: CheckoutRequestStatus.PENDING,
      },
    });
    const floor = occupancy.space?.metadata?.floor;
    return {
      occupancyId: occupancy.id,
      vehiclePlate: (occupancy.vehiclePlate ?? '').toUpperCase(),
      vehicleType: occupancy.vehicleType,
      vehicle: match
        ? {
            id: match.vehicle_id,
            name: match.vehicle_name,
            brand: match.vehicle_brand,
            model: match.vehicle_model,
          }
        : null,
      space: {
        id: occupancy.space.id,
        spaceNumber: occupancy.space.spaceNumber,
        floor: floor ?? null,
      },
      checkInTime: occupancy.checkInTime,
      hoursToCharge: charge.hoursToCharge,
      billedAmountCents: billed,
      coveredAmountCents: covered,
      amountCents: Math.max(0, billed - covered),
      breakdown: charge.breakdown ?? null,
      cashRequest: pending ? this.requestView(pending, viewerUserId) : null,
    };
  }

  private async resolvePendingRequest(
    manager: EntityManager,
    occupancyId: string,
    change: {
      status: CheckoutRequestStatusValue;
      by: string;
      paymentId: string | null;
    },
  ): Promise<CheckoutRequest | null> {
    const pending = await manager.findOne(CheckoutRequest, {
      where: { occupancyId, status: CheckoutRequestStatus.PENDING },
      lock: { mode: 'pessimistic_write' },
    });
    if (!pending) return null;
    pending.status = change.status;
    pending.resolvedByUserId = change.by;
    pending.resolvedAt = new Date();
    pending.paymentId = change.paymentId;
    return manager.save(pending);
  }

  private requestView(
    r: CheckoutRequest,
    viewerUserId: string | null,
  ): CashRequestView {
    return {
      id: r.id,
      status: r.status,
      occupancyId: r.occupancyId,
      parkingLotId: r.parkingLotId,
      vehiclePlate: r.vehiclePlate,
      quotedAmountCents: r.quotedAmountCents,
      mine: viewerUserId != null && r.userId === viewerUserId,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
    };
  }

  private async requestDetail(request: CheckoutRequest, userId: string) {
    const [row] = await this.dataSource.query(
      `SELECT o."totalAmount" AS total_amount, o.is_completed, o.check_out_time, s.space_number, pl.name AS lot_name
         FROM occupancies o JOIN spaces s ON s.id = o.space_id JOIN parking_lots pl ON pl.id = s.parking_lot_id
        WHERE o.id = $1`,
      [request.occupancyId],
    );
    const finalAmountCents = row?.is_completed
      ? decimalToCents(row.total_amount)
      : null;
    const summaries = await this.payments.summariesFor([
      {
        kind: 'OCCUPANCY',
        id: request.occupancyId,
        billedAmountCents: finalAmountCents,
      },
    ]);
    const payment = summaries.get(`OCCUPANCY:${request.occupancyId}`) ?? null;
    return {
      ...this.requestView(request, userId),
      parkingLotName: row?.lot_name ?? null,
      spaceNumber: row?.space_number ?? null,
      checkedOut: !!row?.is_completed,
      checkOutTime: row?.check_out_time ?? null,
      finalAmountCents,
      payment: payment
        ? {
            status: payment.status,
            method: payment.method,
            amountCents: payment.amountCents,
          }
        : null,
    };
  }

  private async uniqueRequest<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.driverError?.code === '23505' || err?.code === '23505') {
        throw new ConflictException({
          code: CheckoutErrorCode.CASH_REQUEST_EXISTS,
          message:
            'Ya hay una solicitud de pago en efectivo para este vehículo. Esperá la confirmación del personal.',
        });
      }
      throw err;
    }
  }

  private async clientName(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    const [row] = await this.dataSource.query(
      `SELECT name FROM client_profiles WHERE user_id = $1`,
      [userId],
    );
    return row?.name ?? null;
  }

  /** Dueño y empleados activos del estacionamiento (destinatarios validados en el backend) */
  private async staffRecipients(
    parkingLotId: string,
  ): Promise<{ ownerIds: string[]; employeeIds: string[] }> {
    const rows: { user_id: string; kind: string }[] =
      await this.dataSource.query(
        `SELECT po.user_id, 'owner' AS kind FROM parking_lots pl JOIN parking_owners po ON po.id = pl.owner_id WHERE pl.id = $1
       UNION
       SELECT pe.user_id, 'employee' AS kind FROM parking_employees pe WHERE pe.parking_lot_id = $1 AND pe.is_active = true`,
        [parkingLotId],
      );
    return {
      ownerIds: rows.filter((r) => r.kind === 'owner').map((r) => r.user_id),
      employeeIds: rows
        .filter((r) => r.kind === 'employee')
        .map((r) => r.user_id),
    };
  }

  private async notifyStaffCashRequested(
    request: CheckoutRequest,
    occupancy: Occupancy,
  ): Promise<void> {
    try {
      const { ownerIds, employeeIds } = await this.staffRecipients(
        request.parkingLotId,
      );
      const clientName = (await this.clientName(request.userId)) ?? 'Cliente';
      const floor = occupancy.space?.metadata?.floor;
      const location = `Espacio ${occupancy.space?.spaceNumber ?? ''}${floor != null ? ` · Piso ${floor}` : ''}`;
      const vehicleType =
        VEHICLE_LABEL[occupancy.vehicleType] ?? occupancy.vehicleType;
      const payload = {
        requestId: request.id,
        occupancyId: request.occupancyId,
        parkingLotId: request.parkingLotId,
        spaceId: occupancy.spaceId,
        spaceNumber: occupancy.space?.spaceNumber ?? null,
        floor: floor ?? null,
        vehiclePlate: request.vehiclePlate,
        vehicleType: occupancy.vehicleType,
        clientName,
        quotedAmountCents: request.quotedAmountCents,
        createdAt: request.createdAt,
      };
      await this.realtime?.emitToUsers(
        [...ownerIds, ...employeeIds],
        CheckoutEvents.CASH_REQUESTED,
        payload,
      );

      const base = {
        type: NotificationType.CHECKOUT_CASH_REQUESTED,
        title: 'Pago en efectivo solicitado',
        message: `${clientName} quiere salir pagando en efectivo. ${request.vehiclePlate ?? ''} (${vehicleType}) · ${location}. Importe estimado: ${formatArs(request.quotedAmountCents)}.`,
        data: payload,
        relatedEntityType: 'checkout_request',
        relatedEntityId: request.id,
        dedupeKey: `checkout-request:${request.id}`,
      };
      await this.notifications?.notifyUsers(ownerIds, {
        ...base,
        link: '/owner/parking',
      });
      await this.notifications?.notifyUsers(employeeIds, {
        ...base,
        link: '/employee/parking',
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo avisar la solicitud ${request.id}: ${(err as Error).message}`,
      );
    }
  }

  /** Avisa al personal y al cliente que la solicitud dejó de estar pendiente */
  private async emitRequestUpdated(request: CheckoutRequest): Promise<void> {
    try {
      const { ownerIds, employeeIds } = await this.staffRecipients(
        request.parkingLotId,
      );
      const staffPayload = {
        requestId: request.id,
        occupancyId: request.occupancyId,
        status: request.status,
      };
      await this.realtime?.emitToUsers(
        [...ownerIds, ...employeeIds],
        CheckoutEvents.REQUEST_UPDATED,
        staffPayload,
      );
      await this.realtime?.emitToUsers(
        [request.userId],
        CheckoutEvents.STATUS,
        {
          requestId: request.id,
          occupancyId: request.occupancyId,
          status: request.status,
        },
      );
    } catch (err) {
      this.logger.warn(
        `No se pudo emitir la actualización de ${request.id}: ${(err as Error).message}`,
      );
    }
  }

  private async notifyClientUnpaid(request: CheckoutRequest): Promise<void> {
    try {
      const [row] = await this.dataSource.query(
        `SELECT "totalAmount" AS total FROM occupancies WHERE id = $1`,
        [request.occupancyId],
      );
      const amount = decimalToCents(row?.total) ?? request.quotedAmountCents;
      await this.notifications?.notifyUsers([request.userId], {
        type: NotificationType.CHECKOUT_UNPAID,
        title: 'Salida registrada con pago pendiente',
        message: `El personal registró la salida de ${request.vehiclePlate ?? 'tu vehículo'}. El pago de ${formatArs(amount)} quedó pendiente.`,
        data: {
          requestId: request.id,
          occupancyId: request.occupancyId,
          amountCents: amount,
        },
        link: '/client/wallet?tab=pending',
        relatedEntityType: 'checkout_request',
        relatedEntityId: request.id,
        dedupeKey: `checkout-unpaid:${request.id}`,
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo notificar el pago pendiente de ${request.id}: ${(err as Error).message}`,
      );
    }
  }
}
