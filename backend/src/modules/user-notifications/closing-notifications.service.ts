import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import {
  dueClosingAlert,
  formatTime,
  nextCloseAt,
} from '../client-tracking/closing-schedule';
import { BUSINESS_TIME_ZONE } from '../parking-profiles/parking-profiles.constants';
import { UserNotificationsService } from './user-notifications.service';
import { NotificationType } from './user-notifications.constants';

interface LotRow {
  id: string;
  name: string;
  open_time: string;
  close_time: string;
}

/**
 * Avisos de cierre 60 y 15 minutos antes, solo para clientes afectados:
 * - con un vehículo registrado actualmente ingresado (seguimiento activo), o
 * - con una reserva confirmada que empieza antes del cierre y termina después.
 * Usa el horario vigente; la clave incluye el instante de cierre, así que un
 * cambio de horario no deja avisos obsoletos ni duplica los ya enviados.
 */
@Injectable()
export class ClosingNotificationsService {
  private readonly logger = new Logger(ClosingNotificationsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: UserNotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run(): Promise<void> {
    try {
      await this.process(new Date());
    } catch (error) {
      this.logger.error('Error procesando avisos de cierre', error as Error);
    }
  }

  /** Devuelve cuántas notificaciones nuevas se crearon */
  async process(nowDate: Date): Promise<number> {
    const now = nowDate.getTime();
    const lots: LotRow[] = await this.dataSource.query(
      `SELECT id, name, open_time::text AS open_time, close_time::text AS close_time FROM parking_lots WHERE is_active = true`,
    );
    let created = 0;
    for (const lot of lots) {
      const closeAt = nextCloseAt(
        now,
        lot.open_time,
        lot.close_time,
        BUSINESS_TIME_ZONE,
      );
      if (!closeAt) continue; // sin horario válido o abierto 24 h
      const due = dueClosingAlert(now, closeAt);
      if (!due) continue;

      const recipients = await this.affectedClients(lot.id, new Date(closeAt));
      if (!recipients.length) continue;

      const hhmm = formatTime(closeAt, BUSINESS_TIME_ZONE);
      const minutesLeft = Math.max(1, Math.round((closeAt - now) / 60_000));
      created += await this.notifications.notifyUsers(recipients, {
        type: NotificationType.CLOSING_SOON,
        title:
          due === 'closing_60'
            ? 'El estacionamiento cerrará pronto'
            : 'Quedan pocos minutos para el cierre',
        message: `El estacionamiento ${lot.name} cerrará a las ${hhmm} (faltan ${minutesLeft} min). Recordá retirar tu vehículo a tiempo.`,
        dedupeKey: `${due}:${lot.id}:${new Date(closeAt).toISOString()}`,
        data: {
          parkingLotId: lot.id,
          parkingLotName: lot.name,
          closeTime: hhmm,
          closeAt: new Date(closeAt).toISOString(),
          minutesLeft,
        },
        link: `/client/parking-lots/${lot.id}`,
        relatedEntityType: 'parking_lot',
        relatedEntityId: lot.id,
      });
    }
    return created;
  }

  private async affectedClients(
    parkingLotId: string,
    closeAt: Date,
  ): Promise<string[]> {
    const rows: { user_id: string }[] = await this.dataSource.query(
      `SELECT l.user_id
         FROM occupancy_client_links l
         JOIN occupancies o ON o.id = l.occupancy_id
        WHERE l.parking_lot_id = $1 AND l.status = 'linked' AND o.is_completed = false
       UNION
       SELECT cp.user_id
         FROM reservations r
         JOIN spaces s ON s.id = r.space_id
         JOIN client_profiles cp ON cp.id = r.client_id
        WHERE s.parking_lot_id = $1 AND r.status = 'confirmed'
          AND r.start_time < $2 AND r.end_time > $2`,
      [parkingLotId, closeAt],
    );
    return rows.map((r) => r.user_id);
  }
}
