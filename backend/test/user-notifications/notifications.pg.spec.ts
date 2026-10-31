/**
 * E2E del centro de notificaciones: PostgreSQL real + AppModule completa + Socket.IO real.
 */
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '54329';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'pw';
process.env.DB_NAME = 'estacionapp_it';
process.env.JWT_SECRET = 'test-secret';
process.env.GOOGLE_CLIENT_ID = 'test';
process.env.GOOGLE_CLIENT_SECRET = 'test';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost/cb';
process.env.RUN_SEED_ON_START = 'false';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { UserNotificationsService } from '../../src/modules/user-notifications/user-notifications.service';
import { OccupancyAlertsService } from '../../src/modules/user-notifications/occupancy-alerts.service';
import { ClosingNotificationsService } from '../../src/modules/user-notifications/closing-notifications.service';
import { nextCloseAt } from '../../src/modules/client-tracking/closing-schedule';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { io } = require('socket.io-client');

jest.setTimeout(120000);
const TZ = 'America/Argentina/Buenos_Aires';

describe('Centro de notificaciones (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let url: string;
  const u = Object.fromEntries(
    [
      'ownerA',
      'ownerB',
      'empA1',
      'empA2',
      'empA3',
      'empB',
      'c1',
      'c2',
      'c3',
      'admin',
    ].map((k) => [k, randomUUID()]),
  ) as Record<string, string>;
  const role: Record<string, string> = {
    ownerA: 'parking_owner',
    ownerB: 'parking_owner',
    empA1: 'parking_employee',
    empA2: 'parking_employee',
    empA3: 'parking_employee',
    empB: 'parking_employee',
    c1: 'client',
    c2: 'client',
    c3: 'client',
    admin: 'admin',
  };
  const prof = { c1: randomUUID(), c2: randomUUID(), c3: randomUUID() };
  const lot = { A: randomUUID(), B: randomUUID(), C: randomUUID() };
  const sp = Object.fromEntries(
    ['A1', 'A2', 'B1', 'C1', 'C2'].map((k) => [k, randomUUID()]),
  ) as Record<string, string>;
  const ids: Record<string, string> = {};
  const sign = (k: string) =>
    jwt.sign({ sub: u[k], email: `${k}@x.com`, role: role[k] }, 'test-secret');
  const H = (k: string) => ({ Authorization: `Bearer ${sign(k)}` });
  const srv = () => app.getHttpServer();
  const sockets: any[] = [];
  const got: Record<string, { event: string; payload: any }[]> = {};
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const list = async (k: string) =>
    (
      await request(srv())
        .get('/api/user-notifications/me?limit=50')
        .set(H(k))
        .expect(200)
    ).body;
  const types = async (k: string) =>
    (await list(k)).items.map((n: any) => n.type);
  const connect = (k: string) =>
    new Promise<void>((resolve, reject) => {
      got[k] = [];
      const s = io(url, {
        auth: { token: sign(k) },
        transports: ['websocket'],
        forceNew: true,
      });
      sockets.push(s);
      s.onAny((event: string, payload: any) => got[k].push({ event, payload }));
      s.on('connect', () => setTimeout(resolve, 200));
      s.on('connect_error', reject);
    });
  const tomorrowAt = (h: number) => {
    const d = new Date(Date.now() + 86_400_000);
    d.setUTCHours(h + 3, 0, 0, 0); // hora de Buenos Aires (UTC-3)
    return d.toISOString();
  };

  beforeAll(async () => {
    const { AppModule } = require('../../src/app.module');
    const { MailerService } = require('@nestjs-modules/mailer');
    // Sin SMTP en el entorno de prueba: los emails existentes de reservas se simulan
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue({ sendMail: async () => undefined })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0);
    url = `http://127.0.0.1:${app.getHttpServer().address().port}`;
    ds = app.get(DataSource);
    const q = (sql: string, p: any[] = []) => ds.query(sql, p);

    for (const k of Object.keys(u))
      await q(`INSERT INTO users (id, email, role) VALUES ($1,$2,$3)`, [
        u[k],
        `${k}-${u[k]}@x.com`,
        role[k],
      ]);
    for (const k of ['c1', 'c2', 'c3'] as const)
      await q(
        `INSERT INTO client_profiles (id, user_id, name) VALUES ($1,$2,$3)`,
        [prof[k], u[k], k.toUpperCase()],
      );
    const poA = randomUUID();
    const poB = randomUUID();
    await q(
      `INSERT INTO parking_owners (id, user_id, name, business_name) VALUES ($1,$2,'A','A'),($3,$4,'B','B')`,
      [poA, u.ownerA, poB, u.ownerB],
    );
    await q(
      `INSERT INTO parking_lots (id, owner_id, name, address, latitude, longitude, open_time, close_time)
       VALUES ($1,$2,'Villa Carmela','Los Sauces',0,0,'08:00','22:00'),
              ($3,$4,'Playa Norte','Calle 1',0,0,'08:00','22:00'),
              ($5,$2,'Playa Chica','Calle 2',0,0,'00:00','00:00')`,
      [lot.A, poA, lot.B, poB, lot.C],
    );
    for (const [k, l] of [
      ['empA1', lot.A],
      ['empA2', lot.A],
      ['empB', lot.B],
    ]) {
      await q(
        `INSERT INTO parking_employees (id, user_id, parking_lot_id, name) VALUES ($1,$2,$3,$4)`,
        [randomUUID(), u[k], l, k],
      );
    }
    await q(
      `INSERT INTO parking_employees (id, user_id, parking_lot_id, name, is_active) VALUES ($1,$2,$3,'inactivo',false)`,
      [randomUUID(), u.empA3, lot.A],
    );
    for (const [k, l] of [
      ['A1', lot.A],
      ['A2', lot.A],
      ['B1', lot.B],
      ['C1', lot.C],
      ['C2', lot.C],
    ]) {
      await q(
        `INSERT INTO spaces (id, parking_lot_id, space_number, "allowedVehicleTypes", allows_reservations) VALUES ($1,$2,$3,'["car"]',true)`,
        [sp[k], l, k],
      );
    }
    ids.rateA = randomUUID();
    await q(
      `INSERT INTO rates (id, parking_lot_id, "vehicleType", price_per_hour) VALUES ($1,$2,'car',2500)`,
      [ids.rateA, lot.A],
    );
    await q(
      `INSERT INTO rates (id, parking_lot_id, "vehicleType", price_per_hour) VALUES ($1,$2,'car',1000),($3,$4,'car',1000)`,
      [randomUUID(), lot.B, randomUUID(), lot.C],
    );

    for (const k of ['c1', 'c2', 'ownerA', 'empA1', 'empB', 'admin'])
      await connect(k);
  });

  afterAll(async () => {
    sockets.forEach((s) => s.close());
    await app?.close();
  });

  describe('reservas', () => {
    it('una solicitud notifica al dueño y a los empleados activos del estacionamiento (8.1)', async () => {
      const r = await request(srv())
        .post('/api/reservations')
        .set(H('c1'))
        .send({
          parkingLotId: lot.A,
          vehicleType: 'car',
          vehiclePlate: 'AB123CD',
          startTime: tomorrowAt(10),
          endTime: tomorrowAt(12),
        })
        .expect(201);
      ids.res1 = r.body.id;
      await wait(1200);
      expect(await types('ownerA')).toEqual(['reservation_request']);
      expect(await types('empA1')).toEqual(['reservation_request']);
      expect(await types('empA2')).toEqual(['reservation_request']);
      expect(await types('empA3')).toEqual([]); // empleado inactivo
      expect(await types('ownerB')).toEqual([]); // otro estacionamiento
      expect(await types('empB')).toEqual([]);
      expect(await types('c1')).toEqual([]);
      const owner = (await list('ownerA')).items[0];
      expect(owner).toMatchObject({
        title: 'Nueva solicitud de reserva',
        category: 'Reservas',
        link: '/owner/parking',
        readAt: null,
      });
      expect(owner.message).toMatch(/AB123CD/);
      expect((await list('empA1')).items[0].link).toBe('/employee/parking');
      expect(
        got.ownerA.some(
          (e) => e.event === 'notification:new' && e.payload.unreadCount === 1,
        ),
      ).toBe(true);
      expect(got.empB.some((e) => e.event === 'notification:new')).toBe(false);
    });

    it('confirmar notifica solo al cliente (8.4)', async () => {
      await request(srv())
        .patch(`/api/reservations/${ids.res1}/confirm`)
        .set(H('empA1'))
        .expect(200);
      await wait(1200);
      expect(await types('c1')).toEqual(['reservation_confirmed']);
      expect((await list('c1')).items[0]).toMatchObject({
        link: '/client/my-reservations',
      });
      expect(await types('ownerA')).toEqual(['reservation_request']);
      expect(await types('empA1')).toEqual(['reservation_request']);
    });

    it('rechazar notifica solo al cliente como rechazo (8.4)', async () => {
      const r = await request(srv())
        .post('/api/reservations')
        .set(H('c1'))
        .send({
          parkingLotId: lot.A,
          vehicleType: 'car',
          vehiclePlate: 'AB123CD',
          startTime: tomorrowAt(14),
          endTime: tomorrowAt(15),
        })
        .expect(201);
      await wait(1200);
      await request(srv())
        .post(`/api/reservations/${r.body.id}/cancel-by-parking`)
        .set(H('ownerA'))
        .send({ reason: 'Sin lugar' })
        .expect(201);
      await wait(1200);
      expect((await types('c1'))[0]).toBe('reservation_rejected');
      expect(await types('ownerA')).toEqual([
        'reservation_request',
        'reservation_request',
      ]);
    });

    it('cancelación del cliente notifica al dueño y empleados activos (8.2)', async () => {
      await request(srv())
        .post(`/api/reservations/${ids.res1}/cancel`)
        .set(H('c1'))
        .expect(201);
      await wait(1200);
      expect((await types('ownerA'))[0]).toBe(
        'reservation_cancelled_by_client',
      );
      expect((await types('empA2'))[0]).toBe('reservation_cancelled_by_client');
      expect(await types('empA3')).toEqual([]);
      expect(
        (await types('c1')).filter(
          (t: string) => t === 'reservation_cancelled_by_client',
        ),
      ).toEqual([]);
    });

    it('si falla la notificación, la operación de negocio igual se completa (2.2)', async () => {
      const r = await request(srv())
        .post('/api/reservations')
        .set(H('c2'))
        .send({
          parkingLotId: lot.A,
          vehicleType: 'car',
          vehiclePlate: 'ZZ999ZZ',
          startTime: tomorrowAt(16),
          endTime: tomorrowAt(17),
        })
        .expect(201);
      await wait(1200);
      const service = app.get(UserNotificationsService);
      const spy = jest
        .spyOn(service as any, 'insertAndEmit')
        .mockRejectedValue(new Error('caída simulada'));
      await request(srv())
        .patch(`/api/reservations/${r.body.id}/confirm`)
        .set(H('ownerA'))
        .expect(200);
      await wait(1200);
      spy.mockRestore();
      const status = await ds.query(
        `SELECT status FROM reservations WHERE id = $1`,
        [r.body.id],
      );
      expect(status[0].status).toBe('confirmed');
    });
  });

  describe('tarifas', () => {
    it('una baja de precio notifica a todos los clientes y a nadie más (6.2)', async () => {
      await request(srv())
        .patch(`/api/rates/${ids.rateA}`)
        .set(H('ownerA'))
        .send({ pricePerHour: 2000 })
        .expect(200);
      await wait(1200);
      for (const k of ['c1', 'c2', 'c3'])
        expect(await types(k)).toContain('rate_reduction');
      const n = (await list('c3')).items.find(
        (x: any) => x.type === 'rate_reduction',
      );
      expect(n.message).toBe(
        'Villa Carmela redujo su tarifa para automóviles de $2.500 a $2.000 por hora.',
      );
      expect(n.data).toMatchObject({
        previousPricePerHour: 2500,
        newPricePerHour: 2000,
        vehicleType: 'car',
      });
      for (const k of ['ownerA', 'empA1', 'admin'])
        expect(await types(k)).not.toContain('rate_reduction');
    });

    it('un aumento no notifica', async () => {
      const before = (await types('c3')).length;
      await request(srv())
        .patch(`/api/rates/${ids.rateA}`)
        .set(H('ownerA'))
        .send({ pricePerHour: 2600 })
        .expect(200);
      await wait(1200);
      expect((await types('c3')).length).toBe(before);
    });
  });

  describe('alertas de ocupación', () => {
    const occupy = (space: string, plate: string) =>
      request(srv())
        .post('/api/occupancy/check-in')
        .set(H('ownerA'))
        .send({ spaceId: space, vehiclePlate: plate, vehicleType: 'car' })
        .expect(201);
    const free = (space: string) =>
      request(srv())
        .post('/api/occupancy/check-out')
        .set(H('ownerA'))
        .send({ spaceId: space })
        .expect(201);
    const availability = async (k: string) =>
      (await types(k)).filter((t: string) => t === 'availability').length;

    it('activar con lugares libres no notifica; es idempotente y solo para clientes (7.2, 7.4)', async () => {
      await request(srv())
        .put(`/api/occupancy-alerts/me/${lot.C}`)
        .set(H('c1'))
        .expect(200);
      await request(srv())
        .put(`/api/occupancy-alerts/me/${lot.C}`)
        .set(H('c1'))
        .expect(200);
      const rows = await ds.query(
        `SELECT count(*)::int AS n FROM occupancy_alert_subscriptions WHERE user_id = $1`,
        [u.c1],
      );
      expect(rows[0].n).toBe(1);
      expect(
        (
          await request(srv()).get('/api/occupancy-alerts/me').set(H('c1'))
        ).body.map((s: any) => s.parkingLotId),
      ).toEqual([lot.C]);
      await request(srv())
        .put(`/api/occupancy-alerts/me/${lot.C}`)
        .set(H('ownerA'))
        .expect(403);
      await request(srv())
        .put(`/api/occupancy-alerts/me/${randomUUID()}`)
        .set(H('c1'))
        .expect(404);
      await wait(1200);
      expect(await availability('c1')).toBe(0);
    });

    it('completo → primera liberación notifica una vez; disponibilidad continua no (7.3)', async () => {
      await occupy(sp.C1, 'CCC111');
      await occupy(sp.C2, 'CCC222');
      await wait(1200);
      expect(await availability('c1')).toBe(0);
      // c2 activa la alerta mientras está completo
      await request(srv())
        .put(`/api/occupancy-alerts/me/${lot.C}`)
        .set(H('c2'))
        .expect(200);
      await free(sp.C1);
      await wait(1500);
      expect(await availability('c1')).toBe(1);
      expect(await availability('c2')).toBe(1);
      expect(
        got.c1.some(
          (e) =>
            e.event === 'notification:new' &&
            e.payload.notification.type === 'availability',
        ),
      ).toBe(true);
      await free(sp.C2);
      await wait(1500);
      expect(await availability('c1')).toBe(1);
    });

    it('vuelve a completarse y se libera antes de 10 min: sin notificación (cooldown)', async () => {
      await occupy(sp.C1, 'CCC333');
      await occupy(sp.C2, 'CCC444');
      await wait(1200);
      await free(sp.C1);
      await wait(1500);
      expect(await availability('c1')).toBe(1);
    });

    it('completo 10 minutos seguidos habilita un nuevo ciclo (7.3 estado 6)', async () => {
      await occupy(sp.C1, 'CCC555');
      await wait(1200);
      const state = await ds.query(
        `SELECT state FROM parking_availability_states WHERE parking_lot_id = $1`,
        [lot.C],
      );
      expect(state[0].state).toBe('full');
      // Simula el paso del tiempo: se libera un lugar 11 minutos después
      await ds.query(`UPDATE spaces SET status = 'available' WHERE id = $1`, [
        sp.C1,
      ]); // no dispara eventos: se evalúa a mano
      const created = await app
        .get(OccupancyAlertsService)
        .evaluate(lot.C, new Date(Date.now() + 11 * 60_000));
      expect(created).toBe(2);
      expect(await availability('c1')).toBe(2);
    });

    it('desactivar impide futuras notificaciones (7.2)', async () => {
      await request(srv())
        .delete(`/api/occupancy-alerts/me/${lot.C}`)
        .set(H('c1'))
        .expect(200);
      await ds.query(
        `UPDATE spaces SET status = 'occupied' WHERE parking_lot_id = $1`,
        [lot.C],
      );
      const alerts = app.get(OccupancyAlertsService);
      await alerts.evaluate(lot.C, new Date(Date.now() + 12 * 60_000));
      await ds.query(`UPDATE spaces SET status = 'available' WHERE id = $1`, [
        sp.C2,
      ]);
      await alerts.evaluate(lot.C, new Date(Date.now() + 30 * 60_000));
      expect(await availability('c1')).toBe(2);
      expect(await availability('c2')).toBe(3);
    });
  });

  describe('cierre del estacionamiento', () => {
    it('60 y 15 minutos antes solo a clientes con vehículo adentro o reserva afectada (6.1)', async () => {
      // c1: vehículo registrado ingresado en Villa Carmela
      await request(srv())
        .post('/api/client-vehicles/me')
        .set(H('c1'))
        .send({ plate: 'AB123CD', vehicleType: 'car' })
        .expect(201);
      await request(srv())
        .post('/api/occupancy/check-in')
        .set(H('empA1'))
        .send({ spaceId: sp.A1, vehiclePlate: 'AB123CD', vehicleType: 'car' })
        .expect(201);
      const closeAt = nextCloseAt(Date.now(), '08:00', '22:00', TZ)!;
      // c2: reserva confirmada que cruza el cierre
      await ds.query(
        `INSERT INTO reservations (id, client_id, space_id, "vehicleType", vehicle_plate, start_time, end_time, status)
         VALUES ($1,$2,$3,'car','QQQ111',$4,$5,'confirmed')`,
        [
          randomUUID(),
          prof.c2,
          sp.A2,
          new Date(closeAt - 2 * 3_600_000),
          new Date(closeAt + 3_600_000),
        ],
      );
      const closing = app.get(ClosingNotificationsService);
      const n60 = await closing.process(new Date(closeAt - 50 * 60_000));
      expect(n60).toBe(2);
      expect(await closing.process(new Date(closeAt - 45 * 60_000))).toBe(0); // no se repite
      const c1 = (await list('c1')).items.find(
        (x: any) => x.type === 'closing_soon',
      );
      expect(c1.title).toBe('El estacionamiento cerrará pronto');
      expect(c1.message).toBe(
        'El estacionamiento Villa Carmela cerrará a las 22:00 (faltan 50 min). Recordá retirar tu vehículo a tiempo.',
      );
      expect(await types('c3')).not.toContain('closing_soon');
      expect(await types('ownerA')).not.toContain('closing_soon');
      expect(await closing.process(new Date(closeAt - 10 * 60_000))).toBe(2);
      expect(
        (await types('c2')).filter((t: string) => t === 'closing_soon'),
      ).toHaveLength(2);
    });
  });

  describe('consulta, lectura y seguridad', () => {
    it('paginación, contador y marcar como leída con sincronización entre pestañas', async () => {
      const page = (
        await request(srv())
          .get('/api/user-notifications/me?page=1&limit=2')
          .set(H('c1'))
          .expect(200)
      ).body;
      expect(page.items).toHaveLength(2);
      expect(page.hasMore).toBe(true);
      const before = (
        await request(srv())
          .get('/api/user-notifications/me/unread-count')
          .set(H('c1'))
      ).body.unreadCount;
      expect(before).toBe(page.total);
      got.c1.length = 0;
      const r = await request(srv())
        .patch(`/api/user-notifications/me/${page.items[0].id}/read`)
        .set(H('c1'))
        .expect(200);
      expect(r.body.unreadCount).toBe(before - 1);
      await request(srv())
        .patch(`/api/user-notifications/me/${page.items[0].id}/read`)
        .set(H('c1'))
        .expect(200); // idempotente
      expect(
        (
          await request(srv())
            .get('/api/user-notifications/me/unread-count')
            .set(H('c1'))
        ).body.unreadCount,
      ).toBe(before - 1);
      await wait(300);
      expect(
        got.c1.some(
          (e) =>
            e.event === 'notification:count' &&
            e.payload.unreadCount === before - 1,
        ),
      ).toBe(true);
      const after = (await list('c1')).items.find(
        (x: any) => x.id === page.items[0].id,
      );
      expect(after.readAt).not.toBeNull(); // sigue visible en el historial
    });

    it('nadie puede leer ni marcar notificaciones ajenas', async () => {
      const mine = (await list('c1')).items[0];
      await request(srv())
        .patch(`/api/user-notifications/me/${mine.id}/read`)
        .set(H('c2'))
        .expect(404);
      await request(srv()).get('/api/user-notifications/me').expect(401);
      expect(JSON.stringify(await list('c2'))).not.toContain(mine.id);
    });

    it('el administrador ve su campana vacía (9)', async () => {
      const admin = await list('admin');
      expect(admin.items).toEqual([]);
      expect(admin.unreadCount).toBe(0);
      expect(got.admin.some((e) => e.event.startsWith('notification:'))).toBe(
        false,
      );
    });

    it('retención: se eliminan solo las vencidas (90 días)', async () => {
      await ds.query(
        `INSERT INTO user_notifications (id, user_id, type, title, message, data, dedupe_key, created_at, expires_at)
         VALUES ($1,$2,'rate_reduction','viejo','viejo','{}','old-1',$3,$4)`,
        [
          randomUUID(),
          u.c3,
          new Date(Date.now() - 91 * 86_400_000),
          new Date(Date.now() - 86_400_000),
        ],
      );
      const total = (
        await ds.query(`SELECT count(*)::int AS n FROM user_notifications`)
      )[0].n;
      expect(
        (await list('c3')).items.some((n: any) => n.title === 'viejo'),
      ).toBe(false);
      const service = app.get(UserNotificationsService);
      expect(await service.deleteExpired(new Date())).toBe(1);
      expect(await service.deleteExpired(new Date())).toBe(0);
      expect(
        (await ds.query(`SELECT count(*)::int AS n FROM user_notifications`))[0]
          .n,
      ).toBe(total - 1);
      const exp = await ds.query(
        `SELECT created_at, expires_at FROM user_notifications WHERE user_id = $1 LIMIT 1`,
        [u.c3],
      );
      expect(
        Math.round((exp[0].expires_at - exp[0].created_at) / 86_400_000),
      ).toBe(90);
    });

    it('no hay notificaciones de ingresos (QR o manual)', async () => {
      const all = await ds.query(
        `SELECT DISTINCT type FROM user_notifications`,
      );
      expect(all.map((r: any) => r.type)).not.toEqual(
        expect.arrayContaining(['checkin']),
      );
      expect(all.some((r: any) => /check|ingreso/.test(r.type))).toBe(false);
    });
  });
});
