import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntitySubscriberInterface, InsertEvent } from 'typeorm';
import {
  RateChangeAction,
  RateChangeLog,
} from '../../rate-history/entities/rate-change-log.entity';
import { UserNotificationsService } from '../user-notifications.service';
import { NotificationType } from '../user-notifications.constants';
import { afterCommit } from './post-commit';

const VEHICLE_LABEL: Record<string, string> = {
  car: 'automóviles',
  motorcycle: 'motos',
  truck: 'camionetas',
  van: 'utilitarios',
};
const money = (n: number) =>
  `$${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

/**
 * Detecta bajas del precio por hora a partir del historial de tarifas existente
 * (rate_change_logs) sin tocar la lógica de tarifas. Aumentos, altas y bajas
 * de tarifa no generan notificaciones.
 */
@Injectable()
export class RateReductionSubscriber implements EntitySubscriberInterface<RateChangeLog> {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notifications: UserNotificationsService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return RateChangeLog;
  }

  afterInsert(event: InsertEvent<RateChangeLog>): void {
    const log = event.entity;
    if (!log?.id || log.action !== RateChangeAction.UPDATED) return;
    const previous =
      log.previousPricePerHour != null
        ? Number(log.previousPricePerHour)
        : null;
    const next =
      log.newPricePerHour != null ? Number(log.newPricePerHour) : null;
    if (previous == null || next == null || !(next < previous)) return;
    afterCommit(() => this.notifyReduction(log.id));
  }

  async notifyReduction(logId: string): Promise<number> {
    const rows: {
      parking_lot_id: string;
      vehicle_type: string;
      previous: string;
      next: string;
      name: string;
    }[] = await this.dataSource.query(
      `SELECT l.parking_lot_id, l.vehicle_type, l.previous_price_per_hour AS previous, l.new_price_per_hour AS next, p.name
           FROM rate_change_logs l JOIN parking_lots p ON p.id = l.parking_lot_id
          WHERE l.id = $1 AND l.action = 'updated' AND p.is_active = true`,
      [logId],
    );
    const r = rows[0];
    if (!r || !(Number(r.next) < Number(r.previous))) return 0;
    const vehicle = VEHICLE_LABEL[r.vehicle_type] ?? r.vehicle_type;
    return this.notifications.notifyAllClients({
      type: NotificationType.RATE_REDUCTION,
      title: '¡Nueva tarifa disponible!',
      message: `${r.name} redujo su tarifa para ${vehicle} de ${money(Number(r.previous))} a ${money(Number(r.next))} por hora.`,
      dedupeKey: `rate:${logId}`,
      data: {
        parkingLotId: r.parking_lot_id,
        parkingLotName: r.name,
        vehicleType: r.vehicle_type,
        previousPricePerHour: Number(r.previous),
        newPricePerHour: Number(r.next),
      },
      link: `/client/parking-lots/${r.parking_lot_id}`,
      relatedEntityType: 'parking_lot',
      relatedEntityId: r.parking_lot_id,
    });
  }
}
