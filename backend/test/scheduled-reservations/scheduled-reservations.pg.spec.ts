/**
 * E2E con PostgreSQL real + AppModule completa: reservas programadas.
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

jest.setTimeout(180000);

const TZ = 'America/Argentina/Buenos_Aires';
const localHour = (iso: string) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date(iso)));

describe('Reservas programadas (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const owner = randomUUID();
  const clients = [randomUUID(), randomUUID(), randomUUID()];
  const profiles = clients.map(() => randomUUID());
  const lot = randomUUID();
  const spaces = { R1: randomUUID(), R2: randomUUID() };

  const sign = (sub: string, role: string) => jwt.sign({ sub, email: `${sub}@x.com`, role }, 'test-secret');
  const H = (i: number) => ({ Authorization: `Bearer ${sign(clients[i], 'client')}` });
  const srv = () => app.getHttpServer();
  const q = (sql: string, p: any[] = []) => ds.query(sql, p);
  const availability = () => request(srv()).get(`/api/reservations/availability/${lot}`).query({ vehicleType: 'car' });
  const reserve = (i: number, startTime: string, endTime: string) =>
    request(srv()).post('/api/reservations').set(H(i)).send({ parkingLotId: lot, vehicleType: 'car', vehiclePlate: `AB${i}23CD`, startTime, endTime });

  beforeAll(async () => {
    const { AppModule } = require('../../src/app.module');
    const { MailerService } = require('@nestjs-modules/mailer');
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue({ sendMail: async () => undefined })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.listen(0);
    ds = app.get(DataSource);

    await q(`INSERT INTO users (id, email, role) VALUES ($1,$2,'parking_owner')`, [owner, `o-${owner}@x.com`]);
    for (let i = 0; i < clients.length; i++) {
      await q(`INSERT INTO users (id, email, role) VALUES ($1,$2,'client')`, [clients[i], `c${i}-${clients[i]}@x.com`]);
      await q(`INSERT INTO client_profiles (id, user_id, name) VALUES ($1,$2,$3)`, [profiles[i], clients[i], `Cliente ${i}`]);
      await q(
        `INSERT INTO client_vehicles (client_profile_id, plate, plate_normalized, vehicle_type, brand, model)
         VALUES ($1,$2::varchar,$2::varchar,'car','Fiat','Cronos')`,
        [profiles[i], `AB${i}23CD`],
      );
    }
    const po = randomUUID();
    await q(`INSERT INTO parking_owners (id, user_id, name, business_name) VALUES ($1,$2,'O','O')`, [po, owner]);
    await q(
      `INSERT INTO parking_lots (id, owner_id, name, address, latitude, longitude, open_time, close_time)
       VALUES ($1,$2,'Playa Centro','San Martín 100',0,0,'08:00','20:00')`,
      [lot, po],
    );
    for (const [num, id] of Object.entries(spaces)) {
      await q(
        `INSERT INTO spaces (id, parking_lot_id, space_number, "allowedVehicleTypes", allows_reservations, metadata)
         VALUES ($1,$2,$3,'["car"]',true,'{"floor":1}')`,
        [id, lot, num],
      );
    }
    await q(`INSERT INTO rates (id, parking_lot_id, "vehicleType", price_per_hour) VALUES ($1,$2,'car',1000)`, [randomUUID(), lot]);
  });

  afterAll(async () => {
    await app?.close();
  });

  let scheduledStart: string;
  let scheduledEnd: string;

  it('devuelve solo horarios futuros, en punto, >= 1 h y dentro del horario de atención (sin login)', async () => {
    const r = await availability().expect(200);
    expect(r.body.openTime).toBe('08:00');
    expect(r.body.closeTime).toBe('20:00');
    expect(r.body.scheduledDiscountPercent).toBe(10);
    expect(r.body.maxAdvanceDays).toBe(15);
    expect(r.body.days.length).toBeGreaterThanOrEqual(15);
    const now = Date.now();
    for (const day of r.body.days) {
      for (const s of day.slots) {
        const t = new Date(s.startTime).getTime();
        expect(s.label).toMatch(/^\d{2}:00$/);
        expect(t).toBeGreaterThanOrEqual(now + 60 * 60 * 1000);
        expect(localHour(s.startTime)).toBeGreaterThanOrEqual(8);
        expect(localHour(s.startTime)).toBeLessThanOrEqual(19);
        expect(s.scheduled).toBe(t - now >= 24 * 3600e3);
      }
    }
    const day = r.body.days[2];
    const slot = day.slots.find((s: any) => s.label === '10:00');
    expect(slot.scheduled).toBe(true);
    scheduledStart = slot.startTime;
  });

  it('egresos: dentro del horario de atención y con precio diferencial', async () => {
    const r = await request(srv())
      .get(`/api/reservations/availability/${lot}/exits`)
      .query({ vehicleType: 'car', startTime: scheduledStart })
      .expect(200);
    expect(r.body.scheduled).toBe(true);
    const all = r.body.days.flatMap((d: any) => d.slots);
    for (const s of all) {
      expect(localHour(s.endTime)).toBeGreaterThanOrEqual(8);
      expect(localHour(s.endTime)).toBeLessThanOrEqual(20);
    }
    const three = all.find((s: any) => s.hours === 3);
    expect(three).toMatchObject({ label: '13:00', baseAmount: 3000, discountPercent: 10, totalAmount: 2700 });
    scheduledEnd = three.endTime;
  });

  it('crea la reserva programada con tarifa diferencial y devuelve espacio y horarios', async () => {
    const r = await reserve(0, scheduledStart, scheduledEnd).expect(201);
    expect(r.body).toMatchObject({
      spaceNumber: 'R1',
      parkingLotName: 'Playa Centro',
      parkingLotAddress: 'San Martín 100',
      isScheduled: true,
      discountPercent: 10,
      baseAmount: 3000,
    });
    expect(Number(r.body.totalAmount)).toBe(2700);
    expect(r.body.startLocal).toMatch(/ 10:00$/);
    expect(r.body.endLocal).toMatch(/ 13:00$/);
    const [row] = await q(`SELECT is_scheduled, base_amount, discount_percent, total_amount FROM reservations WHERE id = $1`, [r.body.id]);
    expect(row).toMatchObject({ is_scheduled: true, base_amount: '3000.00', discount_percent: '10.00', total_amount: '2700.00' });
  });

  it('asegura espacio: el segundo cliente recibe R2 y el tercero 409; el horario deja de ofrecerse', async () => {
    const r2 = await reserve(1, scheduledStart, scheduledEnd).expect(201);
    expect(r2.body.spaceNumber).toBe('R2');
    await reserve(2, scheduledStart, scheduledEnd).expect(409);

    const r = await availability().expect(200);
    const labels = r.body.days[2].slots.map((s: any) => s.label);
    expect(labels).not.toContain('10:00');
    expect(labels).not.toContain('12:00');
    expect(labels).toContain('13:00');
  });

  it('rechaza minutos, fuera del horario y más de 1 h exigida', async () => {
    const base = new Date(scheduledStart).getTime();
    const iso = (ms: number) => new Date(ms).toISOString();
    const r1 = await reserve(2, iso(base + 86400e3 + 30 * 60e3), iso(base + 86400e3 + 3 * 3600e3)).expect(400);
    expect(JSON.stringify(r1.body)).toMatch(/hora en punto/);
    // 10:00 - 3 h = 07:00 (antes de la apertura)
    const r2 = await reserve(2, iso(base + 86400e3 - 3 * 3600e3), iso(base + 86400e3)).expect(400);
    expect(JSON.stringify(r2.body)).toMatch(/fuera del horario/);
    // egreso 21:00 (después del cierre)
    await reserve(2, iso(base + 86400e3), iso(base + 86400e3 + 11 * 3600e3)).expect(400);
    // dentro de 30 minutos
    const soon = Math.ceil((Date.now() + 30 * 60e3) / 3600e3) * 3600e3;
    if (soon < Date.now() + 60 * 60e3) await reserve(2, iso(soon), iso(soon + 3600e3)).expect(400);
  });

  it('una reserva del mismo día (< 24 h) no tiene descuento', async () => {
    const r = await availability().expect(200);
    const slot = r.body.days.flatMap((d: any) => d.slots).find((s: any) => !s.scheduled);
    if (!slot) return; // fuera de horario hoy y temprano mañana: nada que probar
    const res = await reserve(2, slot.startTime, new Date(new Date(slot.startTime).getTime() + 3600e3).toISOString()).expect(201);
    expect(res.body.isScheduled).toBe(false);
    expect(Number(res.body.totalAmount)).toBe(1000);
  });

  it('el descuento es configurable por estacionamiento', async () => {
    await q(`UPDATE parking_lots SET settings = settings || '{"scheduledReservationDiscountPercent": 25}'::jsonb WHERE id = $1`, [lot]);
    const r = await availability().expect(200);
    expect(r.body.scheduledDiscountPercent).toBe(25);
  });
});
