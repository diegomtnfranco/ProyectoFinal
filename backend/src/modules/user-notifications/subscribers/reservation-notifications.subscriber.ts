import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import {
  Reservation,
  ReservationStatus,
} from '../../reservations/entities/reservation.entity';
import { UserNotificationsService } from '../user-notifications.service';
import { NotificationType } from '../user-notifications.constants';
import { afterCommit } from './post-commit';

interface ReservationRow {
  id: string;
  status: ReservationStatus;
  vehicle_plate: string;
  vehicle_type: string;
  start_time: Date;
  end_time: Date;
  parking_lot_id: string;
  parking_lot_name: string;
  space_number: string;
  client_user_id: string;
  client_name: string;
  owner_user_id: string;
}

const fmt = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * Observa las reservas sin modificar su servicio: solo informa.
 * - Nueva solicitud (pending_confirmation) → dueño + empleados activos.
 * - Cancelada por el cliente → dueño + empleados activos.
 * - Confirmada / rechazada / cancelada por el estacionamiento → solo el cliente.
 */
@Injectable()
export class ReservationNotificationsSubscriber implements EntitySubscriberInterface<Reservation> {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notifications: UserNotificationsService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Reservation;
  }

  afterInsert(event: InsertEvent<Reservation>): void {
    const id = event.entity?.id;
    if (id) afterCommit(() => this.handle(id, null));
  }

  afterUpdate(event: UpdateEvent<Reservation>): void {
    const id =
      (event.entity as Reservation | undefined)?.id ?? event.databaseEntity?.id;
    const previous = event.databaseEntity?.status ?? null;
    const next = (event.entity as Reservation | undefined)?.status;
    if (!id || !next || previous === next) return;
    afterCommit(() => this.handle(id, previous));
  }

  /** Lee el estado confirmado en la base y notifica según corresponda */
  async handle(
    reservationId: string,
    previousStatus: string | null,
  ): Promise<void> {
    const rows: ReservationRow[] = await this.dataSource.query(
      `SELECT r.id, r.status, r.vehicle_plate, r."vehicleType" AS vehicle_type, r.start_time, r.end_time,
              pl.id AS parking_lot_id, pl.name AS parking_lot_name, s.space_number,
              cp.user_id AS client_user_id, cp.name AS client_name, po.user_id AS owner_user_id
         FROM reservations r
         JOIN spaces s ON s.id = r.space_id
         JOIN parking_lots pl ON pl.id = s.parking_lot_id
         JOIN parking_owners po ON po.id = pl.owner_id
         JOIN client_profiles cp ON cp.id = r.client_id
        WHERE r.id = $1`,
      [reservationId],
    );
    const r = rows[0];
    if (!r) return;
    const when = `${fmt.format(new Date(r.start_time))} a ${fmt.format(new Date(r.end_time))}`;
    const base = { relatedEntityType: 'reservation', relatedEntityId: r.id };
    const staffData = {
      reservationId: r.id,
      parkingLotId: r.parking_lot_id,
      parkingLotName: r.parking_lot_name,
      vehiclePlate: r.vehicle_plate,
      vehicleType: r.vehicle_type,
      startTime: r.start_time,
      endTime: r.end_time,
      clientName: r.client_name,
    };

    switch (r.status) {
      case ReservationStatus.PENDING_CONFIRMATION:
        if (previousStatus !== null) return; // solo al crearse
        await this.notifyStaff(r, {
          type: NotificationType.RESERVATION_REQUEST,
          title: 'Nueva solicitud de reserva',
          message: `${r.client_name} solicitó una reserva en ${r.parking_lot_name} para ${r.vehicle_plate} (${when}). Confirmala o rechazala desde Solicitudes de Reserva.`,
          dedupeKey: `reservation:${r.id}:requested`,
          data: staffData,
          ...base,
        });
        return;
      case ReservationStatus.CANCELLED_BY_CLIENT:
        await this.notifyStaff(r, {
          type: NotificationType.RESERVATION_CANCELLED_BY_CLIENT,
          title: 'Reserva cancelada por el cliente',
          message: `${r.client_name} canceló su reserva en ${r.parking_lot_name} para ${r.vehicle_plate} (${when}).`,
          dedupeKey: `reservation:${r.id}:cancelled_by_client`,
          data: staffData,
          ...base,
        });
        return;
      case ReservationStatus.CONFIRMED:
        await this.notifications.notifyUsers([r.client_user_id], {
          type: NotificationType.RESERVATION_CONFIRMED,
          title: 'Reserva confirmada',
          message: `${r.parking_lot_name} confirmó tu reserva para ${r.vehicle_plate} (${when}), espacio ${r.space_number}.`,
          dedupeKey: `reservation:${r.id}:confirmed`,
          data: {
            reservationId: r.id,
            parkingLotId: r.parking_lot_id,
            parkingLotName: r.parking_lot_name,
          },
          link: '/client/my-reservations',
          ...base,
        });
        return;
      case ReservationStatus.CANCELLED_BY_PARKING: {
        const rejected =
          previousStatus === ReservationStatus.PENDING_CONFIRMATION ||
          previousStatus === null;
        await this.notifications.notifyUsers([r.client_user_id], {
          type: rejected
            ? NotificationType.RESERVATION_REJECTED
            : NotificationType.RESERVATION_CANCELLED_BY_PARKING,
          title: rejected
            ? 'Reserva rechazada'
            : 'Reserva cancelada por el estacionamiento',
          message: rejected
            ? `${r.parking_lot_name} rechazó tu solicitud de reserva para ${r.vehicle_plate} (${when}).`
            : `${r.parking_lot_name} canceló tu reserva para ${r.vehicle_plate} (${when}).`,
          dedupeKey: `reservation:${r.id}:cancelled_by_parking`,
          data: {
            reservationId: r.id,
            parkingLotId: r.parking_lot_id,
            parkingLotName: r.parking_lot_name,
          },
          link: '/client/my-reservations',
          ...base,
        });
        return;
      }
      default:
        return;
    }
  }

  /** Dueño y empleados activos del estacionamiento (cada rol con su ruta) */
  private async notifyStaff(
    r: ReservationRow,
    input: Parameters<UserNotificationsService['notifyUsers']>[1],
  ) {
    const employees: { user_id: string }[] = await this.dataSource.query(
      `SELECT user_id FROM parking_employees WHERE parking_lot_id = $1 AND is_active = true`,
      [r.parking_lot_id],
    );
    await this.notifications.notifyUsers([r.owner_user_id], {
      ...input,
      link: '/owner/parking',
    });
    await this.notifications.notifyUsers(
      employees.map((e) => e.user_id),
      { ...input, link: '/employee/parking' },
    );
  }
}
