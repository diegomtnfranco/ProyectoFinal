/**
 * E2E con PostgreSQL real + AppModule completa + Socket.IO real.
 * Vehículos del cliente, asociación por patente, seguimiento, alertas y permisos.
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

// socket.io-client no es dependencia del backend: se instala con --no-save (ver README)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { io } = require(process.env.SOCKET_IO_CLIENT_PATH || 'socket.io-client');

jest.setTimeout(120000);

describe('Seguimiento de vehículos para clientes (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let url: string;
  const u = {
    ownerA: randomUUID(),
    empA: randomUUID(),
    empB: randomUUID(),
    c1: randomUUID(),
    c2: randomUUID(),
    c3: randomUUID(),
  };
  const prof = { c1: randomUUID(), c2: randomUUID(), c3: randomUUID() };
  const lot = { A: randomUUID(), B: randomUUID() };
  const sp = Object.fromEntries(
    ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1'].map((k) => [k, randomUUID()]),
  );
  const tok = { inA: 'in-' + randomUUID() };
  const ids: Record<string, string> = {};
  const sign = (sub: string, role: string) =>
    jwt.sign({ sub, email: `${sub}@x.com`, role }, 'test-secret');
  const H = (sub: string, role: string) => ({
    Authorization: `Bearer ${sign(sub, role)}`,
  });
  const C1 = () => H(u.c1, 'client');
  const C2 = () => H(u.c2, 'client');
  const C3 = () => H(u.c3, 'client');
  const EA = () => H(u.empA, 'parking_employee');
  const EB = () => H(u.empB, 'parking_employee');
  const srv = () => app.getHttpServer();
  const sockets: any[] = [];
  const received: Record<string, { event: string; payload: any }[]> = {
    c1: [],
    c2: [],
    c3: [],
  };

  const connect = (key: 'c1' | 'c2' | 'c3', userId: string) =>
    new Promise<void>((resolve, reject) => {
      const s = io(url, {
        auth: { token: sign(userId, 'client') },
        transports: ['websocket'],
        forceNew: true,
      });
      sockets.push(s);
      s.onAny((event: string, payload: any) =>
        received[key].push({ event, payload }),
      );
      s.on('connect', () => setTimeout(resolve, 300));
      s.on('connect_error', reject);
    });
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  beforeAll(async () => {
    const { AppModule } = require('../../src/app.module');
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0);
    url = `http://127.0.0.1:${app.getHttpServer().address().port}`;
    ds = app.get(DataSource);
    const q = (sql: string, p: any[] = []) => ds.query(sql, p);

    const roles: [string, string][] = [
      [u.ownerA, 'parking_owner'],
      [u.empA, 'parking_employee'],
      [u.empB, 'parking_employee'],
      [u.c1, 'client'],
      [u.c2, 'client'],
      [u.c3, 'client'],
    ];
    for (const [id, role] of roles)
      await q(`INSERT INTO users (id, email, role) VALUES ($1,$2,$3)`, [
        id,
        `${id}@x.com`,
        role,
      ]);
    await q(
      `INSERT INTO client_profiles (id, user_id, name) VALUES ($1,$2,'C1'),($3,$4,'C2')`,
      [prof.c1, u.c1, prof.c2, u.c2],
    );
    // C3 tiene el vehículo "viejo" en las columnas default_* (datos existentes)
    await q(
      `INSERT INTO client_profiles (id, user_id, name, default_vehicle_plate, default_vehicle_type) VALUES ($1,$2,'C3','old-777','car')`,
      [prof.c3, u.c3],
    );
    const po = randomUUID();
    await q(
      `INSERT INTO parking_owners (id, user_id, name, business_name) VALUES ($1,$2,'A','A')`,
      [po, u.ownerA],
    );
    await q(
      `INSERT INTO parking_lots (id, owner_id, name, address, latitude, longitude, open_time, close_time, check_in_token)
       VALUES ($1,$2,'Playa Centro','Av. Siempre Viva 742',0,0,'08:00','20:00',$3), ($4,$2,'Playa Norte','Calle Falsa 123',0,0,'08:00','20:00',NULL)`,
      [lot.A, po, tok.inA, lot.B],
    );
    await q(
      `INSERT INTO parking_employees (id, user_id, parking_lot_id, name) VALUES ($1,$2,$3,'EA'),($4,$5,$6,'EB')`,
      [randomUUID(), u.empA, lot.A, randomUUID(), u.empB, lot.B],
    );
    for (const [k, id] of Object.entries(sp)) {
      await q(
        `INSERT INTO spaces (id, parking_lot_id, space_number, "allowedVehicleTypes", allows_reservations) VALUES ($1,$2,$3,'["car"]',true)`,
        [id, k.startsWith('A') ? lot.A : lot.B, k],
      );
    }
    for (const l of [lot.A, lot.B])
      await q(
        `INSERT INTO rates (id, parking_lot_id, "vehicleType", price_per_hour) VALUES ($1,$2,'car',1000)`,
        [randomUUID(), l],
      );
    await q(
      `INSERT INTO rates (id, parking_lot_id, "vehicleType", price_per_hour) VALUES ($1,$2,'van',1500)`,
      [randomUUID(), lot.A],
    );
    await q(`UPDATE spaces SET "allowedVehicleTypes" = '["car","van"]'`);
    await request(srv())
      .put(`/api/parking-profiles/${lot.A}`)
      .set(H(u.ownerA, 'parking_owner'))
      .send({
        services: [
          {
            code: 'car_wash',
            enabled: true,
            pricing: { type: 'extra_cost', amount: 2000, unit: 'per_vehicle' },
          },
        ],
      })
      .expect(200);
    await request(srv())
      .put(`/api/parking-profiles/${lot.A}/night-policy`)
      .set(H(u.ownerA, 'parking_owner'))
      .send({ mode: 'special', nightAmount: 5000 })
      .expect(200);

    await connect('c1', u.c1);
    await connect('c2', u.c2);
    await connect('c3', u.c3);
  });

  afterAll(async () => {
    sockets.forEach((s) => s.close());
    await app?.close();
  });

  describe('vehículos del cliente', () => {
    it('conserva el vehículo existente y no lo recrea si se elimina (6)', async () => {
      const list = await request(srv())
        .get('/api/client-vehicles/me')
        .set(C3())
        .expect(200);
      expect(list.body.map((v: any) => v.plate)).toEqual(['OLD-777']);
      await request(srv())
        .delete(`/api/client-vehicles/me/${list.body[0].id}`)
        .set(C3())
        .expect(204);
      expect(
        (
          await request(srv())
            .get('/api/client-vehicles/me')
            .set(C3())
            .expect(200)
        ).body,
      ).toEqual([]);
      const profile = await ds.query(
        `SELECT default_vehicle_plate FROM client_profiles WHERE id = $1`,
        [prof.c3],
      );
      expect(profile[0].default_vehicle_plate).toBe('old-777'); // dato original intacto
    });

    it('hasta 3 vehículos; el cuarto se rechaza en el backend (1, 2, 3)', async () => {
      for (const [plate, name] of [
        ['AB 123 CD', 'Auto de Ana'],
        ['CC333DD', null],
        ['EE444FF', null],
      ]) {
        const r = await request(srv())
          .post('/api/client-vehicles/me')
          .set(C1())
          .send({
            plate,
            vehicleType: 'car',
            name,
            brand: 'Fiat',
            model: 'Cronos',
          })
          .expect(201);
        ids[`v_${plate}`] = r.body.id;
      }
      const fourth = await request(srv())
        .post('/api/client-vehicles/me')
        .set(C1())
        .send({ plate: 'GG555HH', vehicleType: 'car' });
      expect(fourth.status).toBe(400);
      expect(
        (await request(srv()).get('/api/client-vehicles/me').set(C1())).body,
      ).toHaveLength(3);
    });

    it('no permite duplicados en la misma cuenta según la patente normalizada (5)', async () => {
      await request(srv())
        .delete(`/api/client-vehicles/me/${ids['v_EE444FF']}`)
        .set(C1())
        .expect(204);
      await request(srv())
        .post('/api/client-vehicles/me')
        .set(C1())
        .send({ plate: 'ab-123-cd', vehicleType: 'car' })
        .expect(409);
      const re = await request(srv())
        .post('/api/client-vehicles/me')
        .set(C1())
        .send({ plate: 'EE444FF', vehicleType: 'car' })
        .expect(201);
      ids['v_EE444FF'] = re.body.id;
    });

    it('otra cuenta puede registrar la misma patente; editar y aislar por cuenta (4, 4.3)', async () => {
      const r = await request(srv())
        .post('/api/client-vehicles/me')
        .set(C2())
        .send({ plate: 'AB123CD', vehicleType: 'car' })
        .expect(201);
      await request(srv())
        .patch(`/api/client-vehicles/me/${r.body.id}`)
        .set(C2())
        .send({ brand: 'Ford', model: 'Ka' })
        .expect(200);
      await request(srv())
        .patch(`/api/client-vehicles/me/${r.body.id}`)
        .set(C1())
        .send({ brand: 'X' })
        .expect(404);
      await request(srv())
        .delete(`/api/client-vehicles/me/${r.body.id}`)
        .set(C1())
        .expect(404);
      await request(srv())
        .post('/api/client-vehicles/me')
        .set(C2())
        .send({ plate: 'ZZ999ZZ', vehicleType: 'car' })
        .expect(201);
      await request(srv()).get('/api/client-vehicles/me').set(EA()).expect(403);
      await request(srv())
        .post('/api/client-vehicles/me')
        .set(C1())
        .send({ plate: '!!', vehicleType: 'car' })
        .expect(400);
    });
  });

  describe('asociación de ingresos', () => {
    it('ingreso manual: una ocupación, vinculada a todos los clientes con esa patente (9, 10, 11)', async () => {
      received.c1.length = 0;
      received.c2.length = 0;
      received.c3.length = 0;
      const r = await request(srv())
        .post('/api/occupancy/check-in')
        .set(EA())
        .send({ spaceId: sp.A1, vehiclePlate: 'ab123cd', vehicleType: 'car' })
        .expect(201);
      ids.occAB = r.body.id;
      const occ = await ds.query(
        `SELECT count(*)::int AS n FROM occupancies WHERE id = $1`,
        [ids.occAB],
      );
      expect(occ[0].n).toBe(1);
      const links = await ds.query(
        `SELECT client_profile_id FROM occupancy_client_links WHERE occupancy_id = $1 AND status = 'linked'`,
        [ids.occAB],
      );
      expect(links.map((l: any) => l.client_profile_id).sort()).toEqual(
        [prof.c1, prof.c2].sort(),
      );
      expect(
        (
          await ds.query(`SELECT vehicle_plate FROM occupancies WHERE id=$1`, [
            ids.occAB,
          ])
        )[0].vehicle_plate,
      ).toBe('ab123cd');
      await wait(400);
      expect(received.c1.some((e) => e.event === 'tracking:checkin')).toBe(
        true,
      );
      expect(received.c2.some((e) => e.event === 'tracking:checkin')).toBe(
        true,
      );
      expect(received.c3.some((e) => e.event.startsWith('tracking:'))).toBe(
        false,
      ); // solo destinatarios autorizados
    });

    it('no se repite una patente en el mismo estacionamiento aunque cambie formato o tipo (15)', async () => {
      await request(srv())
        .post('/api/occupancy/check-in')
        .set(EA())
        .send({ spaceId: sp.A2, vehiclePlate: 'AB-123-CD', vehicleType: 'van' })
        .expect(409);
      await request(srv())
        .post('/api/occupancy/anonymous/check-in')
        .send({ token: tok.inA, vehiclePlate: 'AB123CD', vehicleType: 'car' })
        .expect(409);
      // en otro estacionamiento sí puede (es otra playa)
      const b = await request(srv())
        .post('/api/occupancy/check-in')
        .set(EB())
        .send({ spaceId: sp.B1, vehiclePlate: 'AB 123 CD', vehicleType: 'car' })
        .expect(201);
      ids.occAB_B = b.body.id;
    });

    it('ingreso QR asociado por patente registrada (8)', async () => {
      const r = await request(srv())
        .post('/api/occupancy/anonymous/check-in')
        .send({ token: tok.inA, vehiclePlate: 'CC333DD', vehicleType: 'car' })
        .expect(201);
      const links = await ds.query(
        `SELECT l.client_profile_id FROM occupancy_client_links l JOIN occupancies o ON o.id = l.occupancy_id WHERE o.vehicle_plate = 'CC333DD'`,
      );
      expect(links).toEqual([{ client_profile_id: prof.c1 }]);
      expect(r.body.spaceNumber).toBeDefined();
    });

    it('sin coincidencias el ingreso funciona como antes (14)', async () => {
      const r = await request(srv())
        .post('/api/occupancy/check-in')
        .set(EA())
        .send({ spaceId: sp.A3, vehiclePlate: 'NOMATCH1', vehicleType: 'car' })
        .expect(201);
      expect(
        (
          await ds.query(
            `SELECT count(*)::int AS n FROM occupancy_client_links WHERE occupancy_id = $1`,
            [r.body.id],
          )
        )[0].n,
      ).toBe(0);
    });

    it('cuarto seguimiento activo: no pisa los anteriores ni bloquea el ingreso (12, 13)', async () => {
      // C1 ya sigue: AB123CD@A, AB123CD@B, CC333DD@A = 3 activos
      const r = await request(srv())
        .post('/api/occupancy/check-in')
        .set(EA())
        .send({ spaceId: sp.A4, vehiclePlate: 'EE444FF', vehicleType: 'car' })
        .expect(201);
      const link = await ds.query(
        `SELECT status FROM occupancy_client_links WHERE occupancy_id = $1`,
        [r.body.id],
      );
      expect(link).toEqual([{ status: 'skipped_limit' }]);
      const me = await request(srv())
        .get('/api/client-tracking/me')
        .set(C1())
        .expect(200);
      expect(me.body.active).toHaveLength(3);
      expect(me.body.limitNotices.map((n: any) => n.plate)).toEqual([
        'EE444FF',
      ]);
    });
  });

  describe('seguimiento del cliente', () => {
    it('muestra identificación, estacionamiento, dirección, ingreso, estimado y servicios (15, 18)', async () => {
      const me = await request(srv())
        .get('/api/client-tracking/me')
        .set(C1())
        .expect(200);
      const t = me.body.active.find((x: any) => x.occupancyId === ids.occAB);
      expect(t).toMatchObject({
        status: 'active',
        vehicle: {
          name: 'Auto de Ana',
          brand: 'Fiat',
          model: 'Cronos',
          plate: 'ab123cd',
          vehicleType: 'car',
        },
        parkingLot: { name: 'Playa Centro', address: 'Av. Siempre Viva 742' },
        currency: 'ARS',
        nightPolicy: {
          mode: 'special',
          nightAmount: 5000,
          closeTime: '20:00',
          toleranceMinutes: 15,
        },
      });
      expect(t.estimate).toMatchObject({
        isEstimate: true,
        parkingAmount: 1000,
      });
      expect(me.body.refreshSeconds).toBe(300);
    });

    it('cada cliente ve solo lo suyo; otros roles no acceden (47, 49)', async () => {
      const c2 = await request(srv())
        .get('/api/client-tracking/me')
        .set(C2())
        .expect(200);
      expect(c2.body.active.map((t: any) => t.vehicle.plate).sort()).toEqual([
        'AB 123 CD',
        'ab123cd',
      ]);
      expect(JSON.stringify(c2.body)).not.toContain('CC333DD');
      expect(
        (
          await request(srv())
            .get('/api/client-tracking/me')
            .set(C3())
            .expect(200)
        ).body.active,
      ).toEqual([]);
      await request(srv()).get('/api/client-tracking/me').set(EA()).expect(403);
      await request(srv()).get('/api/client-tracking/me').expect(401);
      await request(srv())
        .put(`/api/parking-profiles/${lot.A}/night-policy`)
        .set(C1())
        .send({ mode: 'hourly' })
        .expect(403);
      await request(srv())
        .get(`/api/occupancy/space/${sp.A1}/services`)
        .set(C1())
        .expect(403);
    });

    it('no se puede eliminar ni cambiar la patente de un vehículo estacionado', async () => {
      await request(srv())
        .delete(`/api/client-vehicles/me/${ids['v_AB 123 CD']}`)
        .set(C1())
        .expect(409);
      await request(srv())
        .patch(`/api/client-vehicles/me/${ids['v_AB 123 CD']}`)
        .set(C1())
        .send({ plate: 'XX111XX' })
        .expect(409);
      const list = await request(srv())
        .get('/api/client-vehicles/me')
        .set(C1())
        .expect(200);
      expect(
        list.body.find((v: any) => v.id === ids['v_AB 123 CD']).isParked,
      ).toBe(true);
    });
  });

  describe('servicios: selección, realización y cobro', () => {
    it('el personal marca realización; no realizado no se cobra; avisa al cliente (37, 38, 40, 48)', async () => {
      await request(srv())
        .put(`/api/occupancy/${ids.occAB}/services`)
        .set(EA())
        .send({ serviceKeys: ['catalog:car_wash'] })
        .expect(200);
      await request(srv())
        .patch(`/api/occupancy/${ids.occAB}/services/catalog:car_wash/status`)
        .set(EB())
        .send({ status: 'performed' })
        .expect(403);
      await request(srv())
        .patch(`/api/occupancy/${ids.occAB}/services/catalog:car_wash/status`)
        .set(C1())
        .send({ status: 'performed' })
        .expect(403);
      await request(srv())
        .patch(`/api/occupancy/${ids.occAB}/services/catalog:car_wash/status`)
        .set(EA())
        .send({ status: 'done' })
        .expect(400);
      received.c1.length = 0;
      const r = await request(srv())
        .patch(`/api/occupancy/${ids.occAB}/services/catalog:car_wash/status`)
        .set(EA())
        .send({ status: 'not_performed' })
        .expect(200);
      expect(r.body.selected[0].status).toBe('not_performed');
      await wait(300);
      expect(received.c1.some((e) => e.event === 'tracking:update')).toBe(true);
      let me = await request(srv()).get('/api/client-tracking/me').set(C1());
      let t = me.body.active.find((x: any) => x.occupancyId === ids.occAB);
      expect(t.services).toEqual([
        expect.objectContaining({
          name: 'Limpieza de vehículos',
          status: 'not_performed',
          estimatedSubtotal: 0,
        }),
      ]);
      await request(srv())
        .patch(`/api/occupancy/${ids.occAB}/services/catalog:car_wash/status`)
        .set(EA())
        .send({ status: 'performed' })
        .expect(200);
      me = await request(srv()).get('/api/client-tracking/me').set(C1());
      t = me.body.active.find((x: any) => x.occupancyId === ids.occAB);
      expect(t.services[0]).toMatchObject({
        status: 'performed',
        estimatedSubtotal: 2000,
      });
      expect(t.estimate.servicesAmount).toBe(2000);
      // la otra ocupación del mismo cliente no cambió
      const other = me.body.active.find(
        (x: any) => x.occupancyId === ids.occAB_B,
      );
      expect(other.services).toEqual([]);
    });
  });

  // Las alertas de cierre se migraron al centro de notificaciones: ver test/user-notifications.

  describe('egreso', () => {
    it('finaliza el seguimiento, avisa y conserva el historial; un reingreso no lo pisa (21, 22)', async () => {
      received.c1.length = 0;
      received.c2.length = 0;
      const out = await request(srv())
        .post('/api/occupancy/check-out')
        .set(EA())
        .send({ spaceId: sp.A1 })
        .expect(201);
      await wait(400);
      expect(received.c1.some((e) => e.event === 'tracking:checkout')).toBe(
        true,
      );
      expect(received.c2.some((e) => e.event === 'tracking:checkout')).toBe(
        true,
      );
      let me = await request(srv()).get('/api/client-tracking/me').set(C1());
      expect(
        me.body.active.find((t: any) => t.occupancyId === ids.occAB),
      ).toBeUndefined();
      const fin = me.body.finished.find(
        (t: any) => t.occupancyId === ids.occAB,
      );
      expect(fin).toMatchObject({
        status: 'finished',
        finalAmount: out.body.occupancy.totalAmount,
        estimate: null,
      });

      const again = await request(srv())
        .post('/api/occupancy/check-in')
        .set(EA())
        .send({ spaceId: sp.A5, vehiclePlate: 'AB123CD', vehicleType: 'car' })
        .expect(201);
      me = await request(srv()).get('/api/client-tracking/me').set(C1());
      expect(
        me.body.active.some((t: any) => t.occupancyId === again.body.id),
      ).toBe(true);
      expect(
        me.body.finished.some((t: any) => t.occupancyId === ids.occAB),
      ).toBe(true);
      const dupCheckout = await ds.query(
        `SELECT count(*)::int AS n FROM client_tracking_events WHERE occupancy_id = $1 AND type = 'checkout'`,
        [ids.occAB],
      );
      expect(dupCheckout[0].n).toBe(2); // uno por cliente, sin duplicados
    });
  });
});
