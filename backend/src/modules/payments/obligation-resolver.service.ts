import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Occupancy } from '../occupancy/entities/occupancy.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { decimalToCents } from './money.util';
import {
  ObligationType,
  ObligationTypeValue,
  PaymentErrorCode,
  PaymentStatus,
  obligationKey,
} from './payments.constants';
import { Payment } from './entities/payment.entity';

export interface Obligation {
  type: ObligationTypeValue;
  id: string;
  key: string;
  parkingLotId: string;
  parkingLotName: string;
  reservationId: string | null;
  occupancyId: string | null;
  vehiclePlate: string | null;
  concept: string;
  /** Importe facturado por EstacionApp (reservations.total_amount u occupancies."totalAmount") */
  billedAmountCents: number;
  /** Parte ya pagada a través de la reserva (solo egresos con reserva pagada) */
  coveredAmountCents: number;
  /** Lo que falta cobrar: billed - covered, nunca negativo */
  amountCents: number;
  /** Clientes que pueden pagar esta obligación desde la app */
  payerUserIds: string[];
}

/**
 * Única fuente del importe a cobrar. No calcula tarifas: lee el importe que
 * ya persistieron ReservationsService (al crear la reserva) y OccupancyService
 * (al registrar el egreso con la calculadora de servicios / tarifa nocturna).
 */
@Injectable()
export class ObligationResolverService {
  async resolve(manager: EntityManager, type: ObligationTypeValue, id: string): Promise<Obligation> {
    return type === ObligationType.RESERVATION ? this.resolveReservation(manager, id) : this.resolveOccupancy(manager, id);
  }

  assertPayer(obligation: Obligation, userId: string): void {
    if (!obligation.payerUserIds.includes(userId)) {
      throw new ForbiddenException('Esta operación no pertenece a tu cuenta');
    }
  }

  assertSomethingToPay(obligation: Obligation): void {
    if (obligation.amountCents <= 0) {
      throw new ConflictException({
        code: PaymentErrorCode.NOTHING_TO_PAY,
        message: 'No hay importe pendiente: el egreso quedó cubierto por el pago de la reserva',
      });
    }
  }

  // ---------------------------------------------------------------------------

  private async resolveReservation(manager: EntityManager, id: string): Promise<Obligation> {
    const reservation = await manager.findOne(Reservation, {
      where: { id },
      relations: ['client', 'space', 'space.parkingLot'],
    });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');

    // D2: solo reservas confirmadas por el estacionamiento
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new ConflictException({
        code: PaymentErrorCode.NOT_PAYABLE,
        message: 'Solo se pueden pagar reservas confirmadas',
      });
    }
    const billed = decimalToCents(reservation.totalAmount ?? null);
    if (!billed || billed <= 0) {
      throw new ConflictException({ code: PaymentErrorCode.NOT_PAYABLE, message: 'La reserva no tiene importe facturado' });
    }

    return {
      type: ObligationType.RESERVATION,
      id: reservation.id,
      key: obligationKey(ObligationType.RESERVATION, reservation.id),
      parkingLotId: reservation.space.parkingLotId,
      parkingLotName: reservation.space.parkingLot?.name ?? '',
      reservationId: reservation.id,
      occupancyId: null,
      vehiclePlate: reservation.vehiclePlate?.toUpperCase() ?? null,
      concept: `Reserva · ${reservation.space.parkingLot?.name ?? 'Estacionamiento'}`,
      billedAmountCents: billed,
      coveredAmountCents: 0,
      amountCents: billed,
      payerUserIds: reservation.client?.userId ? [reservation.client.userId] : [],
    };
  }

  private async resolveOccupancy(manager: EntityManager, id: string): Promise<Obligation> {
    const occupancy = await manager.findOne(Occupancy, {
      where: { id },
      relations: ['space', 'space.parkingLot', 'reservation', 'reservation.client'],
    });
    if (!occupancy) throw new NotFoundException('Estadía no encontrada');

    // El importe existe recién cuando el sistema registró el egreso
    if (!occupancy.isCompleted || occupancy.totalAmount === null || occupancy.totalAmount === undefined) {
      throw new ConflictException({
        code: PaymentErrorCode.NOT_PAYABLE,
        message: 'El vehículo todavía no egresó: el importe final aún no está calculado',
      });
    }
    const billed = decimalToCents(occupancy.totalAmount) ?? 0;

    // D3: si la reserva asociada ya fue pagada, se cobra solo la diferencia
    let covered = 0;
    if (occupancy.reservationId) {
      const reservationPayment = await manager.findOne(Payment, {
        where: {
          obligationKey: obligationKey(ObligationType.RESERVATION, occupancy.reservationId),
          status: PaymentStatus.APPROVED,
        },
      });
      if (reservationPayment) covered = Math.min(billed, reservationPayment.amountCents);
    }

    const payers = new Set<string>();
    if (occupancy.reservation?.client?.userId) payers.add(occupancy.reservation.client.userId);
    // Clientes vinculados por patente (feature de seguimiento); misma regla: solo 'linked'
    const links: { user_id: string }[] = await manager.query(
      `SELECT user_id FROM occupancy_client_links WHERE occupancy_id = $1 AND status = 'linked'`,
      [occupancy.id],
    );
    links.forEach((l) => payers.add(l.user_id));

    const lotName = occupancy.space?.parkingLot?.name ?? 'Estacionamiento';
    return {
      type: ObligationType.OCCUPANCY,
      id: occupancy.id,
      key: obligationKey(ObligationType.OCCUPANCY, occupancy.id),
      parkingLotId: occupancy.space.parkingLotId,
      parkingLotName: lotName,
      reservationId: occupancy.reservationId ?? null,
      occupancyId: occupancy.id,
      vehiclePlate: (occupancy.vehiclePlate || occupancy.reservation?.vehiclePlate || '').toUpperCase() || null,
      concept: covered > 0 ? `Estadía (saldo restante de la reserva) · ${lotName}` : `Estadía · ${lotName}`,
      billedAmountCents: billed,
      coveredAmountCents: covered,
      amountCents: Math.max(0, billed - covered),
      payerUserIds: [...payers],
    };
  }
}
