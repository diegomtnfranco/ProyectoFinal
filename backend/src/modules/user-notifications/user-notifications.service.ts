import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { TrackingNotifierService } from '../tracking-notifier/tracking-notifier.service';
import { UserNotification } from './entities/user-notification.entity';
import {
  addDays,
  NOTIFICATION_CATEGORY,
  NOTIFICATION_RETENTION_DAYS,
  NotificationTypeValue,
} from './user-notifications.constants';
import {
  NotificationPage,
  NotificationView,
} from './dto/user-notifications.dto';

export interface NotificationInput {
  type: NotificationTypeValue;
  title: string;
  message: string;
  dedupeKey: string;
  data?: Record<string, unknown>;
  link?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

interface InsertedRow {
  id: string;
  user_id: string;
  created_at: Date;
}

/**
 * Centro de notificaciones persistentes (PostgreSQL es la fuente de verdad).
 * Nunca lanza errores hacia quien lo llama: una notificación fallida no puede
 * afectar una operación de negocio.
 */
@Injectable()
export class UserNotificationsService {
  private readonly logger = new Logger(UserNotificationsService.name);

  constructor(
    @InjectRepository(UserNotification)
    private readonly repository: Repository<UserNotification>,
    private readonly dataSource: DataSource,
    private readonly notifier: TrackingNotifierService,
  ) {}

  // ------------------------------------------------------------ creación

  /** Crea una notificación por destinatario (idempotente) y la envía en tiempo real */
  async notifyUsers(
    userIds: string[],
    input: NotificationInput,
  ): Promise<number> {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) return 0;
    return this.insertAndEmit(
      `SELECT unnest($11::uuid[]) AS user_id`,
      [ids],
      input,
    );
  }

  /** Notifica a todos los clientes activos (una sola inserción masiva) */
  async notifyAllClients(input: NotificationInput): Promise<number> {
    return this.insertAndEmit(
      `SELECT u.id AS user_id FROM users u WHERE u.role = 'client' AND u.is_active = true`,
      [],
      input,
    );
  }

  private async insertAndEmit(
    sourceSql: string,
    extraParams: unknown[],
    input: NotificationInput,
  ): Promise<number> {
    try {
      const now = new Date();
      const expiresAt = addDays(now, NOTIFICATION_RETENTION_DAYS);
      // Fechas desde JS (igual que el resto del proyecto) para no depender de la zona horaria de la base
      const rows: InsertedRow[] = await this.dataSource.query(
        `INSERT INTO user_notifications
           (id, user_id, type, title, message, data, link, related_entity_type, related_entity_id, dedupe_key, created_at, expires_at)
         SELECT uuid_generate_v4(), src.user_id, $1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10
           FROM (${sourceSql}) src
         ON CONFLICT ON CONSTRAINT "UQ_user_notification_dedupe" DO NOTHING
         RETURNING id, user_id, created_at`,
        [
          input.type,
          input.title.slice(0, 120),
          input.message.slice(0, 500),
          JSON.stringify(input.data ?? {}),
          input.link ?? null,
          input.relatedEntityType ?? null,
          input.relatedEntityId ?? null,
          input.dedupeKey.slice(0, 200),
          now,
          expiresAt,
          ...extraParams,
        ],
      );
      if (rows.length) await this.emitCreated(rows, input);
      return rows.length;
    } catch (error) {
      this.logger.error(
        `No se pudo crear la notificación ${input.type}`,
        error as Error,
      );
      return 0;
    }
  }

  private async emitCreated(
    rows: InsertedRow[],
    input: NotificationInput,
  ): Promise<void> {
    const counts = await this.unreadCounts(rows.map((r) => r.user_id));
    const payloads = new Map<string, Record<string, unknown>>();
    for (const r of rows) {
      const notification: NotificationView = {
        id: r.id,
        type: input.type,
        category: NOTIFICATION_CATEGORY[input.type] ?? 'General',
        title: input.title,
        message: input.message,
        data: input.data ?? {},
        link: input.link ?? null,
        readAt: null,
        createdAt: r.created_at,
      };
      payloads.set(r.user_id, {
        notification,
        unreadCount: counts.get(r.user_id) ?? 1,
      });
    }
    await this.notifier.emitPerUser('notification:new', payloads);
  }

  // ------------------------------------------------------------ consulta del usuario

  async listMine(
    userId: string,
    page = 1,
    limit = 15,
  ): Promise<NotificationPage> {
    const now = new Date();
    const [rows, total] = await this.repository.findAndCount({
      where: { userId, expiresAt: MoreThan(now) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: rows.map((r) => this.toView(r)),
      page,
      limit,
      total,
      hasMore: page * limit < total,
      unreadCount: await this.unreadCount(userId),
    };
  }

  unreadCount(userId: string): Promise<number> {
    return this.repository.count({
      where: { userId, readAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });
  }

  /** Solo el destinatario puede marcarla (si no es suya: 404, sin revelar que existe) */
  async markRead(
    userId: string,
    id: string,
  ): Promise<{ id: string; readAt: Date; unreadCount: number }> {
    const notification = await this.repository.findOne({
      where: { id, userId, expiresAt: MoreThan(new Date()) },
    });
    if (!notification)
      throw new NotFoundException('Notificación no encontrada');
    const readAt = notification.readAt ?? new Date();
    if (!notification.readAt)
      await this.repository.update({ id, userId }, { readAt });
    const unreadCount = await this.unreadCount(userId);
    // Sincroniza el contador en otras pestañas del mismo usuario
    await this.notifier.emitToUsers([userId], 'notification:count', {
      unreadCount,
      readId: id,
    });
    return { id, readAt, unreadCount };
  }

  // ------------------------------------------------------------ retención 90 días

  @Cron('0 15 3 * * *', { timeZone: 'America/Argentina/Buenos_Aires' })
  async runRetention(): Promise<void> {
    await this.deleteExpired(new Date());
  }

  /** Borra solo notificaciones vencidas, en lotes. Seguro ante ejecuciones repetidas. */
  async deleteExpired(now: Date): Promise<number> {
    let removed = 0;
    try {
      for (;;) {
        // En postgres, TypeORM devuelve [filas, cantidad] para DELETE
        const result: [unknown[], number] = await this.dataSource.query(
          `DELETE FROM user_notifications WHERE id IN (
             SELECT id FROM user_notifications WHERE expires_at < $1 LIMIT 5000
           )`,
          [now],
        );
        const count = Array.isArray(result) ? Number(result[1] ?? 0) : 0;
        removed += count;
        if (count < 5000) break;
      }
      if (removed)
        this.logger.log(`Notificaciones vencidas eliminadas: ${removed}`);
    } catch (error) {
      this.logger.error(
        'Error eliminando notificaciones vencidas',
        error as Error,
      );
    }
    return removed;
  }

  // ------------------------------------------------------------ helpers

  private async unreadCounts(userIds: string[]): Promise<Map<string, number>> {
    if (!userIds.length) return new Map();
    const rows: { user_id: string; n: number }[] = await this.dataSource.query(
      `SELECT user_id, count(*)::int AS n FROM user_notifications
        WHERE user_id = ANY($1::uuid[]) AND read_at IS NULL AND expires_at > $2
        GROUP BY user_id`,
      [userIds, new Date()],
    );
    return new Map(rows.map((r) => [r.user_id, r.n]));
  }

  private toView(n: UserNotification): NotificationView {
    return {
      id: n.id,
      type: n.type,
      category:
        NOTIFICATION_CATEGORY[n.type as NotificationTypeValue] ?? 'General',
      title: n.title,
      message: n.message,
      data: n.data ?? {},
      link: n.link,
      readAt: n.readAt,
      createdAt: n.createdAt,
    };
  }
}
