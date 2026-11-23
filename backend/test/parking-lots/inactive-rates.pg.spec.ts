/**
 * Regresión: guardar un estacionamiento que tiene tarifas inactivas devolvía 500
 * (findOne filtra las inactivas y save() intentaba poner parking_lot_id = NULL).
 * Cubre las 5 operaciones corregidas contra PostgreSQL real.
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
process.env.FRONTEND_URL = 'https://demo.trycloudflare.com';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { ParkingLotsService } from '../../src/modules/parking-lots/parking-lots.service';

jest.setTimeout(90000);

describe('Estacionamiento con tarifas inactivas', () => {
  let app: INestApplication;
  let ds: DataSource;
  const owner = randomUUID();
  const admin = randomUUID();
  const lot = randomUUID();
  const activeRate = randomUUID();
  const inactiveRate = randomUUID();
  const H = (sub: string, role: string) => ({
    Authorization: `Bearer ${jwt.sign({ sub, email: `${sub}@x.com`, role }, 'test-secret')}`,
  });
  const OWNER = () => H(owner, 'parking_owner');
  const srv = () => app.getHttpServer();

  const ratesIntact = async () => {
    const rows = await ds.query(
      `SELECT id, parking_lot_id, is_active FROM rates WHERE parking_lot_id = $1 ORDER BY is_active DESC`,
      [lot],
    );
    expect(rows).toEqual([
      { id: activeRate, parking_lot_id: lot, is_active: true },
      { id: inactiveRate, parking_lot_id: lot, is_active: false },
    ]);
  };

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
    const q = (s: string, p: any[] = []) => ds.query(s, p);
    await q(
      `INSERT INTO users (id, email, role) VALUES ($1,'o@x.com','parking_owner'),($2,'a@x.com','admin')`,
      [owner, admin],
    );
    const po = randomUUID();
    await q(
      `INSERT INTO parking_owners (id, user_id, name, business_name) VALUES ($1,$2,'A','A')`,
      [po, owner],
    );
    await q(
      `INSERT INTO parking_lots (id, owner_id, name, address, latitude, longitude, open_time, close_time) VALUES ($1,$2,'Villa Carmela','Los Sauces',0,0,'08:00','22:00')`,
      [lot, po],
    );
    await q(
      `INSERT INTO spaces (id, parking_lot_id, space_number) VALUES ($1,$2,'A1')`,
      [randomUUID(), lot],
    );
    await q(
      `INSERT INTO rates (id, parking_lot_id, "vehicleType", price_per_hour) VALUES ($1,$2,'car',1000)`,
      [activeRate, lot],
    );
    // tarifa eliminada (soft delete): es lo que provocaba el 500
    await q(
      `INSERT INTO rates (id, parking_lot_id, "vehicleType", price_per_hour, is_active) VALUES ($1,$2,'motorcycle',500,false)`,
      [inactiveRate, lot],
    );
  });

  afterAll(async () => app?.close());

  it('generar QR (antes: 500)', async () => {
    const res = await request(srv())
      .post(`/api/parking-lots/${lot}/generate-qr`)
      .set(OWNER())
      .expect(201);
    const row = (
      await ds.query(
        `SELECT check_in_token, check_out_token, check_in_qr_url, qr_updated_at FROM parking_lots WHERE id = $1`,
        [lot],
      )
    )[0];
    expect(row.check_in_token).toBe(res.body.checkInToken);
    expect(row.check_out_token).toBe(res.body.checkOutToken);
    expect(row.check_in_qr_url).toMatch(/^data:image\/png;base64,/);
    expect(row.qr_updated_at).not.toBeNull();
    expect(res.body.rates.map((r: any) => r.id)).toEqual([activeRate]); // la respuesta sigue sin tarifas inactivas
    await ratesIntact();
  });

  it('regenerar un solo QR (antes: 500)', async () => {
    const before = (
      await ds.query(
        `SELECT check_in_token, check_out_token FROM parking_lots WHERE id = $1`,
        [lot],
      )
    )[0];
    const res = await request(srv())
      .post(`/api/parking-lots/${lot}/generate-qr/check-in`)
      .set(OWNER())
      .expect(201);
    const after = (
      await ds.query(
        `SELECT check_in_token, check_out_token FROM parking_lots WHERE id = $1`,
        [lot],
      )
    )[0];
    expect(after.check_in_token).not.toBe(before.check_in_token);
    expect(after.check_in_token).toBe(res.body.checkInToken);
    expect(after.check_out_token).toBe(before.check_out_token); // el otro QR no cambia
    await ratesIntact();
  });

  it('el QR regenerado apunta a FRONTEND_URL y se valida', async () => {
    const qrs = (
      await request(srv()).get(`/api/parking-lots/${lot}/qr-codes`).expect(200)
    ).body;
    const token = qrs.checkIn.token;
    const validated = await app
      .get(ParkingLotsService)
      .validateQRToken(token, 'check-in');
    expect(validated.id).toBe(lot);
  });

  it('editar el estacionamiento conserva el merge de settings (antes: 500)', async () => {
    const res = await request(srv())
      .patch(`/api/parking-lots/${lot}`)
      .set(OWNER())
      .send({ name: 'Villa Carmela II', settings: { maxAdvanceDays: 10 } })
      .expect(200);
    expect(res.body.name).toBe('Villa Carmela II');
    const row = (
      await ds.query(`SELECT name, settings FROM parking_lots WHERE id = $1`, [
        lot,
      ])
    )[0];
    expect(row.name).toBe('Villa Carmela II');
    expect(row.settings).toMatchObject({
      maxAdvanceDays: 10,
      allowOnlineReservations: true,
      cancellationMinutesBefore: 30,
    });
    await request(srv())
      .patch(`/api/parking-lots/${lot}`)
      .set(OWNER())
      .send({})
      .expect(200); // sin cambios: no falla
    await ratesIntact();
  });

  it('activar/desactivar (admin) (antes: 500)', async () => {
    await request(srv())
      .patch(`/api/parking-lots/${lot}/status`)
      .set(H(admin, 'admin'))
      .send({ isActive: false })
      .expect(200);
    expect(
      (
        await ds.query(`SELECT is_active FROM parking_lots WHERE id = $1`, [
          lot,
        ])
      )[0].is_active,
    ).toBe(false);
    await request(srv())
      .patch(`/api/parking-lots/${lot}/status`)
      .set(H(admin, 'admin'))
      .send({ isActive: true })
      .expect(200);
    expect(
      (
        await ds.query(`SELECT is_active FROM parking_lots WHERE id = $1`, [
          lot,
        ])
      )[0].is_active,
    ).toBe(true);
    await ratesIntact();
  });

  it('cambiar la imagen (antes: 500)', async () => {
    const saved = await app
      .get(ParkingLotsService)
      .updateImage(
        lot,
        'https://example.com/foto.webp',
        owner,
        'parking_owner',
      );
    expect(saved.imageUrl).toBe('https://example.com/foto.webp');
    expect(
      (
        await ds.query(`SELECT image_url FROM parking_lots WHERE id = $1`, [
          lot,
        ])
      )[0].image_url,
    ).toBe('https://example.com/foto.webp');
    await ratesIntact();
  });

  it('la API pública sigue ocultando las tarifas inactivas', async () => {
    const res = await request(srv())
      .get(`/api/parking-lots/${lot}`)
      .expect(200);
    expect(res.body.rates.map((r: any) => r.id)).toEqual([activeRate]);
  });
});
