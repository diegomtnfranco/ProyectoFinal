import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { Space } from '../../spaces/entities/space.entity';
import { OccupancyAlertsService } from '../occupancy-alerts.service';

/**
 * Observa cambios de estado de los espacios (ingresos, egresos, reservas,
 * mantenimiento) sin modificar esa lógica, y pide reevaluar la disponibilidad.
 */
@Injectable()
export class SpaceAvailabilitySubscriber implements EntitySubscriberInterface<Space> {
  constructor(
    @InjectDataSource() dataSource: DataSource,
    private readonly alerts: OccupancyAlertsService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Space;
  }

  afterInsert(event: InsertEvent<Space>): void {
    this.alerts.schedule(event.entity?.parkingLotId);
  }

  afterUpdate(event: UpdateEvent<Space>): void {
    const relevant = event.updatedColumns.some(
      (c) => c.propertyName === 'status' || c.propertyName === 'isActive',
    );
    if (!relevant && event.updatedColumns.length) return;
    const lotId =
      (event.entity as Space | undefined)?.parkingLotId ??
      event.databaseEntity?.parkingLotId;
    if (lotId) this.alerts.schedule(lotId);
  }

  afterRemove(event: RemoveEvent<Space>): void {
    const lotId =
      event.entity?.parkingLotId ?? event.databaseEntity?.parkingLotId;
    if (lotId) this.alerts.schedule(lotId);
  }
}
