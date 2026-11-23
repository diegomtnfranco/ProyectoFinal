import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { OccupancyAlertSubscription } from './entities/occupancy-alert-subscription.entity';
import { ParkingAvailabilityState } from './entities/parking-availability-state.entity';
import {
  decideTransition,
  isSubscriberEligible,
  MachineState,
} from './availability-machine';
import { UserNotificationsService } from './user-notifications.service';
import { NotificationType } from './user-notifications.constants';

const DEBOUNCE_MS = 800;

/**
 * Alertas de ocupación: "avisame cuando se libere un lugar".
 * Lee la ocupación real (spaces) sin modificarla y persiste el estado del ciclo.
 */
@Injectable()
export class OccupancyAlertsService {
  private readonly logger = new Logger(OccupancyAlertsService.name);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    @InjectRepository(OccupancyAlertSubscription)
    private readonly subscriptionRepository: Repository<OccupancyAlertSubscription>,
    private readonly dataSource: DataSource,
    private readonly notifications: UserNotificationsService,
  ) {}

  // ------------------------------------------------------------ suscripciones del cliente

  async listMine(
    userId: string,
  ): Promise<{ parkingLotId: string; activatedAt: Date }[]> {
    const subs = await this.subscriptionRepository.find({
      where: { userId, isActive: true },
      order: { activatedAt: 'DESC' },
    });
    return subs.map((s) => ({
      parkingLotId: s.parkingLotId,
      activatedAt: s.activatedAt,
    }));
  }

  /** Activar es idempotente: varias pestañas, reintentos o doble clic no duplican ni reinician la alerta */
  async activate(
    userId: string,
    parkingLotId: string,
  ): Promise<{ parkingLotId: string; active: true }> {
    const lot: unknown[] = await this.dataSource.query(
      `SELECT 1 FROM parking_lots WHERE id = $1 AND is_active = true`,
      [parkingLotId],
    );
    if (!lot.length)
      throw new NotFoundException('Estacionamiento no encontrado');
    const now = new Date();
    await this.dataSource.query(
      `INSERT INTO occupancy_alert_subscriptions (id, user_id, parking_lot_id, is_active, activated_at, created_at, updated_at)
       VALUES (uuid_generate_v4(), $1, $2, true, $3, $3, $3)
       ON CONFLICT ON CONSTRAINT "UQ_occupancy_alert_user_lot" DO UPDATE
         SET activated_at = CASE WHEN occupancy_alert_subscriptions.is_active THEN occupancy_alert_subscriptions.activated_at ELSE EXCLUDED.activated_at END,
             is_active = true,
             updated_at = EXCLUDED.updated_at`,
      [userId, parkingLotId, now],
    );
    // Asegura el estado inicial del estacionamiento (sin notificar)
    this.schedule(parkingLotId);
    return { parkingLotId, active: true };
  }

  async deactivate(
    userId: string,
    parkingLotId: string,
  ): Promise<{ parkingLotId: string; active: false }> {
    await this.subscriptionRepository.update(
      { userId, parkingLotId },
      { isActive: false },
    );
    return { parkingLotId, active: false };
  }

  // ------------------------------------------------------------ máquina de estados

  /** Agrupa cambios casi simultáneos de un estacionamiento en una sola evaluación */
  schedule(parkingLotId: string): void {
    if (!parkingLotId) return;
    clearTimeout(this.timers.get(parkingLotId));
    this.timers.set(
      parkingLotId,
      setTimeout(() => {
        this.timers.delete(parkingLotId);
        void this.evaluate(parkingLotId);
      }, DEBOUNCE_MS),
    );
  }

  /** Respaldo: cambios que no pasan por eventos de TypeORM (updates masivos) */
  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateSubscribedLots(): Promise<void> {
    try {
      const lots: { parking_lot_id: string }[] = await this.dataSource.query(
        `SELECT DISTINCT parking_lot_id FROM occupancy_alert_subscriptions WHERE is_active = true`,
      );
      for (const l of lots) await this.evaluate(l.parking_lot_id);
    } catch (error) {
      this.logger.error('Error evaluando alertas de ocupación', error as Error);
    }
  }

  /**
   * Evalúa la ocupación real y aplica la transición dentro de una transacción con
   * la fila de estado bloqueada: liberaciones simultáneas producen una sola transición.
   */
  async evaluate(parkingLotId: string, now = new Date()): Promise<number> {
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const [{ total, available }] = await manager.query<
          { total: number; available: number }[]
        >(
          `SELECT count(*) FILTER (WHERE is_active)::int AS total,
                  count(*) FILTER (WHERE is_active AND status = 'available')::int AS available
             FROM spaces WHERE parking_lot_id = $1`,
          [parkingLotId],
        );

        const current = await this.lockState(manager, parkingLotId);
        const { next, release } = decideTransition(
          current,
          available,
          total,
          now,
        );
        if (!release) {
          await this.saveState(manager, parkingLotId, next, now);
          return { recipients: [] as string[], cycle: null as Date | null };
        }

        const subs = await manager.find(OccupancyAlertSubscription, {
          where: { parkingLotId, isActive: true },
        });
        const recipients = subs.filter((s) =>
          isSubscriberEligible(
            release.lotEligible,
            current?.lastNotifiedAt ?? null,
            s.activatedAt,
          ),
        );
        if (recipients.length) {
          next.lastNotifiedAt = now;
          await manager.update(
            OccupancyAlertSubscription,
            recipients.map((r) => r.id),
            { lastNotifiedAt: now },
          );
        }
        await this.saveState(manager, parkingLotId, next, now);
        return {
          recipients: recipients.map((r) => r.userId),
          cycle: release.cycleStartedAt,
        };
      });

      if (result.recipients.length && result.cycle) {
        const lot: { name: string }[] = await this.dataSource.query(
          `SELECT name FROM parking_lots WHERE id = $1`,
          [parkingLotId],
        );
        const name = lot[0]?.name ?? 'El estacionamiento';
        return this.notifications.notifyUsers(result.recipients, {
          type: NotificationType.AVAILABILITY,
          title: '¡Se liberó un lugar!',
          message: `${name} tiene lugares disponibles nuevamente.`,
          dedupeKey: `availability:${parkingLotId}:${result.cycle.toISOString()}`,
          data: { parkingLotId, parkingLotName: name },
          link: `/client/parking-lots/${parkingLotId}`,
          relatedEntityType: 'parking_lot',
          relatedEntityId: parkingLotId,
        });
      }
      return 0;
    } catch (error) {
      this.logger.error(
        `Error evaluando ocupación de ${parkingLotId}`,
        error as Error,
      );
      return 0;
    }
  }

  private async lockState(
    manager: EntityManager,
    parkingLotId: string,
  ): Promise<MachineState | null> {
    const rows: {
      state: 'full' | 'available';
      full_since: Date | null;
      last_notified_at: Date | null;
    }[] = await manager.query(
      `SELECT state, full_since, last_notified_at FROM parking_availability_states WHERE parking_lot_id = $1 FOR UPDATE`,
      [parkingLotId],
    );
    if (!rows.length) return null;
    return {
      state: rows[0].state,
      fullSince: rows[0].full_since,
      lastNotifiedAt: rows[0].last_notified_at,
    };
  }

  private async saveState(
    manager: EntityManager,
    parkingLotId: string,
    s: MachineState,
    now: Date,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO parking_availability_states (parking_lot_id, state, full_since, last_notified_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (parking_lot_id) DO UPDATE
         SET state = EXCLUDED.state, full_since = EXCLUDED.full_since,
             last_notified_at = EXCLUDED.last_notified_at, updated_at = EXCLUDED.updated_at`,
      [parkingLotId, s.state, s.fullSince, s.lastNotifiedAt, now],
    );
  }
}

// Para tipado de la entidad en otros archivos
export { ParkingAvailabilityState };
