import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ParkingAccessService } from '../payments/parking-access.service';
import { PAYMENTS_TIMEZONE, PaymentStatusValue } from '../payments/payments.constants';

type Granularity = 'day' | 'week' | 'month';
const SERIES_LENGTH: Record<Granularity, number> = { day: 30, week: 12, month: 12 };

/**
 * Finanzas del dueño: solo lectura sobre la tabla payments.
 * - Ingresos = pagos APPROVED (wallet, Mercado Pago y presenciales).
 * - Cada obligación tiene como máximo un pago aprobado (índice único), por lo
 *   que los totales no pueden sumar dos veces la misma operación.
 * - Fechas agrupadas en hora de Buenos Aires.
 */
@Injectable()
export class FinanceService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly access: ParkingAccessService,
  ) {}

  async lots(userId: string) {
    return this.access.ownerLots(userId);
  }

  async summary(userId: string, parkingLotId?: string) {
    const lotIds = await this.scope(userId, parkingLotId);
    const tz = PAYMENTS_TIMEZONE;
    const [row] = await this.dataSource.query(
      `WITH bounds AS (
         SELECT (date_trunc('day',  now() AT TIME ZONE '${tz}') AT TIME ZONE '${tz}') AS day_start,
                (date_trunc('week', now() AT TIME ZONE '${tz}') AT TIME ZONE '${tz}') AS week_start,
                (now() - interval '30 days') AS month_start
       )
       SELECT
         COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'APPROVED' AND p.approved_at >= b.day_start), 0)   AS today,
         COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'APPROVED' AND p.approved_at >= b.week_start), 0)  AS week,
         COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'APPROVED' AND p.approved_at >= b.month_start), 0) AS month,
         COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'APPROVED'), 0) AS total,
         COUNT(*) FILTER (WHERE p.status = 'APPROVED')  AS approved,
         COUNT(*) FILTER (WHERE p.status = 'PENDING')   AS pending,
         COUNT(*) FILTER (WHERE p.status = 'REJECTED')  AS rejected,
         COUNT(*) FILTER (WHERE p.status = 'CANCELLED') AS cancelled,
         COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'APPROVED' AND p.method = 'WALLET'), 0)       AS by_wallet,
         COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'APPROVED' AND p.method = 'MERCADO_PAGO'), 0) AS by_mp,
         COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'APPROVED' AND p.method = 'PRESENTIAL'), 0)   AS by_presential
       FROM bounds b
       LEFT JOIN payments p ON p.parking_lot_id = ANY($1::uuid[])
       GROUP BY b.day_start, b.week_start, b.month_start`,
      [lotIds],
    );
    const n = (v: unknown) => Number(v ?? 0);
    return {
      parkingLotId: parkingLotId ?? null,
      currency: 'ARS',
      incomeTodayCents: n(row?.today),
      incomeWeekCents: n(row?.week),
      incomeLast30DaysCents: n(row?.month),
      incomeTotalCents: n(row?.total),
      counts: { approved: n(row?.approved), pending: n(row?.pending), rejected: n(row?.rejected), cancelled: n(row?.cancelled) },
      byMethodCents: { wallet: n(row?.by_wallet), mercadoPago: n(row?.by_mp), presential: n(row?.by_presential) },
    };
  }

  async series(userId: string, granularity: Granularity, parkingLotId?: string) {
    const lotIds = await this.scope(userId, parkingLotId);
    const tz = PAYMENTS_TIMEZONE;
    const g = (['day', 'week', 'month'] as const).includes(granularity) ? granularity : 'day';
    const length = SERIES_LENGTH[g];
    const rows: { bucket: Date | string; amount: string; count: string }[] = await this.dataSource.query(
      `WITH buckets AS (
         SELECT generate_series(
                  date_trunc('${g}', now() AT TIME ZONE '${tz}') - ($2::int - 1) * interval '1 ${g}',
                  date_trunc('${g}', now() AT TIME ZONE '${tz}'),
                  interval '1 ${g}') AS bucket
       )
       SELECT to_char(b.bucket, 'YYYY-MM-DD') AS bucket,
              COALESCE(SUM(p.amount_cents), 0) AS amount,
              COUNT(p.id) AS count
         FROM buckets b
         LEFT JOIN payments p
           ON p.status = 'APPROVED'
          AND p.parking_lot_id = ANY($1::uuid[])
          AND date_trunc('${g}', p.approved_at AT TIME ZONE '${tz}') = b.bucket
        GROUP BY b.bucket
        ORDER BY b.bucket`,
      [lotIds, length],
    );
    return {
      granularity: g,
      currency: 'ARS',
      points: rows.map((r) => ({ period: String(r.bucket), amountCents: Number(r.amount), count: Number(r.count) })),
    };
  }

  async payments(
    userId: string,
    q: { parkingLotId?: string; status?: PaymentStatusValue; page?: number; limit?: number },
  ) {
    const lotIds = await this.scope(userId, q.parkingLotId);
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const params: unknown[] = [lotIds];
    let where = `p.parking_lot_id = ANY($1::uuid[])`;
    if (q.status) {
      params.push(q.status);
      where += ` AND p.status = $${params.length}`;
    }
    const [{ total }] = await this.dataSource.query(`SELECT COUNT(*)::int AS total FROM payments p WHERE ${where}`, params);
    const rows = await this.dataSource.query(
      `SELECT p.id, p.created_at, p.approved_at, p.vehicle_plate, p.concept, p.amount_cents, p.billed_amount_cents,
              p.covered_amount_cents, p.method, p.status, p.obligation_type, p.parking_lot_id, pl.name AS parking_lot_name,
              cp.name AS client_name, u.email AS client_email
         FROM payments p
         JOIN parking_lots pl ON pl.id = p.parking_lot_id
         LEFT JOIN users u ON u.id = p.payer_user_id
         LEFT JOIN client_profiles cp ON cp.user_id = p.payer_user_id
        WHERE ${where}
        ORDER BY p.created_at DESC
        LIMIT ${Number(limit)} OFFSET ${(Number(page) - 1) * Number(limit)}`,
      params,
    );
    return {
      items: rows.map((r: any) => ({
        id: r.id,
        createdAt: r.created_at,
        approvedAt: r.approved_at,
        vehiclePlate: r.vehicle_plate,
        clientName: r.client_name ?? null,
        clientEmail: r.client_email ?? null,
        parkingLotId: r.parking_lot_id,
        parkingLotName: r.parking_lot_name,
        obligationType: r.obligation_type,
        concept: r.concept,
        amountCents: Number(r.amount_cents),
        billedAmountCents: Number(r.billed_amount_cents),
        coveredAmountCents: Number(r.covered_amount_cents),
        method: r.method,
        status: r.status,
      })),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  }

  /** Estacionamientos del dueño; si pide uno ajeno -> 403 */
  private async scope(userId: string, parkingLotId?: string): Promise<string[]> {
    const lots = await this.access.ownerLots(userId);
    if (parkingLotId) {
      if (!lots.some((l) => l.id === parkingLotId)) {
        throw new ForbiddenException('No tenés acceso a las finanzas de este estacionamiento');
      }
      return [parkingLotId];
    }
    return lots.map((l) => l.id);
  }
}
