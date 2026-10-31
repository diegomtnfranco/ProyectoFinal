/**
 * E2E con PostgreSQL real (embedded-postgres) y la AppModule completa:
 * guards globales reales, ValidationPipe de main.ts, check-in/checkout reales.
 * Ver README de esta carpeta para ejecutarlo.
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
import { Occupancy } from '../../src/modules/occupancy/entities/occupancy.entity';

jest.setTimeout(120000);

describe('Tarifa nocturna + servicios por ocupación (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const u = {
    ownerA: randomUUID(),
    ownerB: randomUUID(),
    empA: randomUUID(),
    empB: randomUUID(),
    client: randomUUID(),
  };
  const lot = { A: randomUUID(), B: randomUUID(), C: randomUUID() };
  const space = {
    A1: randomUUID(),
    A2: randomUUID(),
    A3: randomUUID(),
    B1: randomUUID(),
  };
  const tok = {
    inA: 'in-a-' + randomUUID(),
    outA: 'out-a-' + randomUUID(),
    inC: 'in-c-' + randomUUID(),
  };
  const ids: Record<string, string> = {};
  const auth = (sub: string, role: string) => ({
    Authorization: `Bearer ${jwt.sign({ sub, email: `${sub}@x.com`, role }, 'test-secret')}`,
  });
  const H = {
    ownerA: () => auth(u.ownerA, 'parking_owner'),
    ownerB: () => auth(u.ownerB, 'parking_owner'),
    empA: () => auth(u.empA, 'parking_employee'),
    empB: () => auth(u.empB, 'parking_employee'),
    client: () => auth(u.client, 'client'),
  };
  const srv = () => app.getHttpServer();

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
    await app.init();
    ds = app.get(DataSource);
    const q = (sql: string, p: any[] = []) => ds.query(sql, p);

    for (const [id, role] of Object.entries({
      [u.ownerA]: 'parking_owner',
      [u.ownerB]: 'parking_owner',
      [u.empA]: 'parking_employee',
      [u.empB]: 'parking_employee',
      [u.client]: 'client',
    })) {
      await q(`INSERT INTO users (id, email, role) VALUES ($1,$2,$3)`, [
        id,
        `${id}@x.com`,
        role,
      ]);
    }
    const poA = randomUUID();
    const poB = randomUUID();
    await q(
      `INSERT INTO parking_owners (id, user_id, name, business_name) VALUES ($1,$2,'A','A'),($3,$4,'B','B')`,
      [poA, u.ownerA, poB, u.ownerB],
    );
    await q(
      `INSERT INTO parking_lots (id, owner_id, name, address, latitude, longitude, open_time, close_time, check_in_token, check_out_token)
       VALUES ($1,$2,'A','Dir A',0,0,'08:00','20:00',$3,$4), ($5,$6,'B','Dir B',0,0,'08:00','20:00',NULL,NULL), ($7,$2,'C','Dir C',0,0,'08:00','20:00',$8,NULL)`,
      [lot.A, poA, tok.inA, tok.outA, lot.B, poB, lot.C, tok.inC],
    );
    await q(
      `INSERT INTO parking_employees (id, user_id, parking_lot_id, name) VALUES ($1,$2,$3,'EA'),($4,$5,$6,'EB')`,
      [randomUUID(), u.empA, lot.A, randomUUID(), u.empB, lot.B],
    );
    for (const [id, l, n] of [
      [space.A1, lot.A, 'A1'],
      [space.A2, lot.A, 'A2'],
      [space.A3, lot.A, 'A3'],
      [space.B1, lot.B, 'B1'],
    ]) {
      await q(
        `INSERT INTO spaces (id, parking_lot_id, space_number, "allowedVehicleTypes", allows_reservations) VALUES ($1,$2,$3,'["car"]',true)`,
        [id, l, n],
      );
    }
    for (const l of [lot.A, lot.B, lot.C]) {
      await q(
        `INSERT INTO rates (id, parking_lot_id, "vehicleType", price_per_hour) VALUES ($1,$2,'car',1000)`,
        [randomUUID(), l],
      );
    }

    // Configuración de servicios (feature parking-profiles, vía API)
    await request(srv())
      .put(`/api/parking-profiles/${lot.A}`)
      .set(H.ownerA())
      .send({
        services: [
          {
            code: 'car_wash',
            enabled: true,
            pricing: { type: 'extra_cost', amount: 2000, unit: 'per_vehicle' },
          },
          {
            code: 'helmet_storage',
            enabled: true,
            pricing: { type: 'included' },
          },
        ],
      })
      .expect(200);
    ids.inflado = (
      await request(srv())
        .post(`/api/parking-profiles/${lot.A}/custom-services`)
        .set(H.ownerA())
        .send({ title: 'Inflado', pricing: { type: 'free' } })
        .expect(201)
    ).body.id;
    ids.oculto = (
      await request(srv())
        .post(`/api/parking-profiles/${lot.A}/custom-services`)
        .set(H.ownerA())
        .send({ title: 'Oculto', isActive: false, pricing: { type: 'free' } })
        .expect(201)
    ).body.id;
    ids.bOnly = (
      await request(srv())
        .post(`/api/parking-profiles/${lot.B}/custom-services`)
        .set(H.ownerB())
        .send({
          title: 'Solo B',
          pricing: { type: 'extra_cost', amount: 50, unit: 'per_use' },
        })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => app?.close());

  describe('configuración de tarifa nocturna', () => {
    it('solo el dueño del estacionamiento puede configurarla', async () => {
      await request(srv())
        .put(`/api/parking-profiles/${lot.A}/night-policy`)
        .set(H.empA())
        .send({ mode: 'special', nightAmount: 5000 })
        .expect(403);
      await request(srv())
        .put(`/api/parking-profiles/${lot.A}/night-policy`)
        .set(H.client())
        .send({ mode: 'special', nightAmount: 5000 })
        .expect(403);
      await request(srv())
        .put(`/api/parking-profiles/${lot.A}/night-policy`)
        .set(H.ownerB())
        .send({ mode: 'special', nightAmount: 5000 })
        .expect(403);
    });

    it('valida importe y modalidad', async () => {
      await request(srv())
        .put(`/api/parking-profiles/${lot.A}/night-policy`)
        .set(H.ownerA())
        .send({ mode: 'special' })
        .expect(400);
      await request(srv())
        .put(`/api/parking-profiles/${lot.A}/night-policy`)
        .set(H.ownerA())
        .send({ mode: 'special', nightAmount: -1 })
        .expect(400);
      await request(srv())
        .put(`/api/parking-profiles/${lot.A}/night-policy`)
        .set(H.ownerA())
        .send({ mode: 'weekly' })
        .expect(400);
    });

    it('sin configuración es por hora; luego se guarda la especial', async () => {
      const before = await request(srv())
        .get(`/api/parking-profiles/${lot.A}/night-policy`)
        .set(H.ownerA())
        .expect(200);
      expect(before.body).toMatchObject({
        mode: 'hourly',
        toleranceMinutes: 15,
        openTime: '08:00',
        closeTime: '20:00',
      });
      const res = await request(srv())
        .put(`/api/parking-profiles/${lot.A}/night-policy`)
        .set(H.ownerA())
        .send({ mode: 'special', nightAmount: 5000 })
        .expect(200);
      expect(res.body).toMatchObject({ mode: 'special', nightAmount: 5000 });
      // independiente por estacionamiento
      const b = await request(srv())
        .get(`/api/parking-profiles/${lot.B}/night-policy`)
        .set(H.ownerB())
        .expect(200);
      expect(b.body.mode).toBe('hourly');
    });
  });

  describe('ingreso por QR', () => {
    it('lista solo servicios activos y habilitados del estacionamiento del QR (16, 17)', async () => {
      const res = await request(srv())
        .get(`/api/occupancy/anonymous/services`)
        .query({ token: tok.inA })
        .expect(200);
      expect(
        res.body.map((s: any) => [
          s.name,
          s.pricing.type,
          s.pricing.amount,
          s.pricing.unit,
        ]),
      ).toEqual([
        ['Limpieza de vehículos', 'extra_cost', 2000, 'per_vehicle'],
        ['Custodia de cascos', 'included', null, null],
        ['Inflado', 'free', null, null],
      ]);
      await request(srv())
        .get(`/api/occupancy/anonymous/services`)
        .query({ token: 'nope' })
        .expect(404);
    });

    it('estacionamiento sin servicios habilitados devuelve lista vacía (14)', async () => {
      const res = await request(srv())
        .get(`/api/occupancy/anonymous/services`)
        .query({ token: tok.inC })
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it('mantiene los requisitos de patente y tipo de vehículo (15)', async () => {
      await request(srv())
        .post('/api/occupancy/anonymous/check-in')
        .send({ token: tok.inA, vehiclePlate: 'AAA111' })
        .expect(400);
      await request(srv())
        .post('/api/occupancy/anonymous/check-in')
        .send({ token: tok.inA, vehicleType: 'car' })
        .expect(400);
    });

    it('con varios servicios; los de otro estacionamiento o inexistentes no se asocian (12, 23)', async () => {
      const res = await request(srv())
        .post('/api/occupancy/anonymous/check-in')
        .send({
          token: tok.inA,
          vehiclePlate: 'QRS111',
          vehicleType: 'car',
          serviceKeys: [
            'catalog:car_wash',
            'catalog:helmet_storage',
            `custom:${ids.bOnly}`,
            `custom:${ids.oculto}`,
            'catalog:nope',
          ],
        })
        .expect(201);
      expect(res.body.services.map((s: any) => s.name)).toEqual([
        'Limpieza de vehículos',
        'Custodia de cascos',
      ]);
      expect(res.body.ignoredServiceKeys).toHaveLength(3);
      const rows = await ds.query(
        `SELECT service_key FROM occupancy_service_selections s JOIN occupancies o ON o.id = s.occupancy_id WHERE o.vehicle_plate = 'QRS111'`,
      );
      expect(rows.map((r: any) => r.service_key).sort()).toEqual([
        'catalog:car_wash',
        'catalog:helmet_storage',
      ]);
    });

    it('sin servicios el ingreso se completa normalmente (13)', async () => {
      const res = await request(srv())
        .post('/api/occupancy/anonymous/check-in')
        .send({ token: tok.inA, vehiclePlate: 'QRS222', vehicleType: 'car' })
        .expect(201);
      expect(res.body.services).toEqual([]);
    });
  });

  describe('ingreso manual y edición posterior', () => {
    it('ingreso manual con servicios (18) y sin servicios (19)', async () => {
      const r1 = await request(srv())
        .post('/api/occupancy/check-in')
        .set(H.empA())
        .send({
          spaceId: space.A3,
          vehiclePlate: 'MAN111',
          vehicleType: 'car',
          serviceKeys: [`custom:${ids.inflado}`],
        })
        .expect(201);
      expect(r1.body.services.map((s: any) => s.name)).toEqual(['Inflado']);
      ids.occMan1 = r1.body.id;
      const r2 = await request(srv())
        .post('/api/occupancy/check-in')
        .set(H.empB())
        .send({ spaceId: space.B1, vehiclePlate: 'MAN222', vehicleType: 'car' })
        .expect(201);
      ids.occMan2 = r2.body.id;
    });

    it('lista para el formulario manual solo para personal del estacionamiento', async () => {
      await request(srv())
        .get(`/api/parking-profiles/${lot.A}/selectable-services`)
        .set(H.empA())
        .expect(200);
      await request(srv())
        .get(`/api/parking-profiles/${lot.A}/selectable-services`)
        .set(H.empB())
        .expect(403);
      await request(srv())
        .get(`/api/parking-profiles/${lot.A}/selectable-services`)
        .set(H.client())
        .expect(403);
    });

    it('usuarios sin permiso no pueden ver ni editar (22, 24)', async () => {
      await request(srv())
        .get(`/api/occupancy/space/${space.A3}/services`)
        .set(H.empB())
        .expect(403);
      await request(srv())
        .put(`/api/occupancy/${ids.occMan1}/services`)
        .set(H.empB())
        .send({ serviceKeys: [] })
        .expect(403);
      await request(srv())
        .put(`/api/occupancy/${ids.occMan1}/services`)
        .set(H.ownerB())
        .send({ serviceKeys: [] })
        .expect(403);
      await request(srv())
        .put(`/api/occupancy/${ids.occMan1}/services`)
        .set(H.client())
        .send({ serviceKeys: [] })
        .expect(403);
      await request(srv())
        .put(`/api/occupancy/${ids.occMan1}/services`)
        .send({ serviceKeys: [] })
        .expect(401);
    });

    it('edición posterior afecta solo a esa ocupación (20, 21) y rechaza servicios ajenos (23)', async () => {
      const view = await request(srv())
        .get(`/api/occupancy/space/${space.A3}/services`)
        .set(H.empA())
        .expect(200);
      expect(view.body.selected.map((s: any) => s.key)).toEqual([
        `custom:${ids.inflado}`,
      ]);

      await request(srv())
        .put(`/api/occupancy/${ids.occMan1}/services`)
        .set(H.empA())
        .send({ serviceKeys: [`custom:${ids.bOnly}`] })
        .expect(400);
      await request(srv())
        .put(`/api/occupancy/${ids.occMan1}/services`)
        .set(H.empA())
        .send({ serviceKeys: ['DROP TABLE'] })
        .expect(400);

      const upd = await request(srv())
        .put(`/api/occupancy/${ids.occMan1}/services`)
        .set(H.ownerA())
        .send({ serviceKeys: ['catalog:car_wash'] })
        .expect(200);
      expect(upd.body.selected.map((s: any) => s.key)).toEqual([
        'catalog:car_wash',
      ]);

      const qr1 = await ds.query(
        `SELECT count(*)::int AS n FROM occupancy_service_selections s JOIN occupancies o ON o.id = s.occupancy_id WHERE o.vehicle_plate = 'QRS111'`,
      );
      expect(qr1[0].n).toBe(2);
    });
  });

  describe('cálculo final en el egreso', () => {
    it('cambio de precio y de política con el vehículo adentro no altera lo congelado (11, 25)', async () => {
      await request(srv())
        .put(`/api/parking-profiles/${lot.A}`)
        .set(H.ownerA())
        .send({
          services: [
            {
              code: 'car_wash',
              enabled: false,
              pricing: {
                type: 'extra_cost',
                amount: 9999,
                unit: 'per_vehicle',
              },
            },
          ],
        })
        .expect(200);
      await request(srv())
        .put(`/api/parking-profiles/${lot.A}/night-policy`)
        .set(H.ownerA())
        .send({ mode: 'hourly' })
        .expect(200);

      // El vehículo QR ingresó con política especial: lo llevamos 30 h atrás para que cruce al menos una noche
      const occ = await ds
        .getRepository(Occupancy)
        .findOneByOrFail({ vehiclePlate: 'QRS111', isCompleted: false });
      await ds
        .getRepository(Occupancy)
        .update(occ.id, { checkInTime: new Date(Date.now() - 30 * 3_600_000) });

      const res = await request(srv())
        .post('/api/occupancy/anonymous/check-out')
        .send({ token: tok.outA, vehiclePlate: 'QRS111' })
        .expect(201);
      const b = res.body.breakdown;
      expect(b.mode).toBe('special');
      expect(b.nights).toBeGreaterThanOrEqual(1);
      expect(b.nightAmountPerNight).toBe(5000);
      // 7 + 26: sin doble cobro — las horas nocturnas no se cobran por hora
      expect(b.parkingAmount).toBe(b.hourlyHours * 1000 + b.nights * 5000);
      expect(b.hourlyHours).toBeLessThan(30);
      // 8, 9, 25: lavado con el precio congelado (2000), cascos incluido sin cargo
      expect(b.services.map((s: any) => [s.name, s.subtotal])).toEqual([
        ['Limpieza de vehículos', 2000],
        ['Custodia de cascos', 0],
      ]);
      expect(b.servicesAmount).toBe(2000);
      expect(res.body.totalAmount).toBe(b.parkingAmount + 2000);
      const saved = await ds
        .getRepository(Occupancy)
        .findOneByOrFail({ id: occ.id });
      expect(Number(saved.totalAmount)).toBe(res.body.totalAmount);
    });

    it('egreso manual de un ingreso hecho con política por hora: cálculo histórico + servicios', async () => {
      // occMan1 se registró con política especial; occMan2 (lote B) nunca tuvo política => por hora
      const res = await request(srv())
        .post('/api/occupancy/check-out')
        .set(H.empB())
        .send({ spaceId: space.B1 })
        .expect(201);
      expect(res.body.breakdown).toMatchObject({
        mode: 'hourly',
        nights: 0,
        hourlyHours: 1,
        parkingAmount: 1000,
        servicesAmount: 0,
        total: 1000,
      });
      expect(res.body.occupancy.totalAmount).toBe(1000);
    });

    it('egreso manual con servicio editado: suma el adicional una vez', async () => {
      const res = await request(srv())
        .post('/api/occupancy/check-out')
        .set(H.empA())
        .send({ spaceId: space.A3 })
        .expect(201);
      // car_wash se agregó en la edición ANTES del cambio de precio => 2000
      expect(res.body.breakdown.services).toEqual([
        expect.objectContaining({
          name: 'Limpieza de vehículos',
          subtotal: 2000,
        }),
      ]);
      expect(res.body.occupancy.totalAmount).toBe(
        res.body.breakdown.parkingAmount + 2000,
      );
    });

    it('no se pueden editar servicios de una ocupación finalizada', async () => {
      await request(srv())
        .put(`/api/occupancy/${ids.occMan1}/services`)
        .set(H.empA())
        .send({ serviceKeys: [] })
        .expect(409);
    });
  });
});
