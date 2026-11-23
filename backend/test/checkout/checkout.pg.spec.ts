/**
 * E2E con PostgreSQL real + AppModule completa + Socket.IO real:
 * vehículo obligatorio, checkout QR con identificación automática, pago con
 * billetera (atómico, idempotente, concurrente), pago en efectivo con
 * confirmación del personal, egreso con pago pendiente, permisos y WebSockets.
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
import { WalletService } from '../../src/modules/payments/wallet.service';

// socket.io-client no es dependencia del backend: se instala con --no-save (ver README)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { io } = require(process.env.SOCKET_IO_CLIENT_PATH || 'socket.io-client');

jest.setTimeout(180000);

type Key = 'ownerA' | 'ownerB' | 'empA' | 'empB' | 'c1' | 'c2' | 'c3' | 'c4' | 'admin';

describe('Checkout QR con pagos (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let url: string;
  const u: Record<Key, string> = {
    ownerA: randomUUID(),
    ownerB: randomUUID(),
    empA: randomUUID(),
    empB: randomUUID(),
    c1: randomUUID(),
    c2: randomUUID(),
    c3: randomUUID(),
    c4: randomUUID(),
    admin: randomUUID(),
  };
  const role: Record<Key, string> = {
    ownerA: 'parking_owner',
    ownerB: 'parking_owner',
    empA: 'parking_employee',
    empB: 'parking_employee',
    c1: 'client',
    c2: 'client',
    c3: 'client',
    c4: 'client',
    admin: 'admin',
  };
  const prof = { c1: randomUUID(), c2: randomUUID(), c3: randomUUID(), c4: randomUUID() };
  const lot = { A: randomUUID(), B: randomUUID() };
  const tok = { outA: 'out-' + randomUUID(), outB: 'out-' + randomUUID(), inA: 'in-' + randomUUID() };
  const sp = Object.fromEntries(
    ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'B1', 'B2'].map((k) => [k, randomUUID()]),
  ) as Record<string, string>;
  const occ: Record<string, string> = {};
  const ids: Record<string, string> = {};

  const sign = (k: Key) => jwt.sign({ sub: u[k], email: `${u[k]}@x.com`, role: role[k] }, 'test-secret');
  const H = (k: Key) => ({ Authorization: `Bearer ${sign(k)}` });
  const srv = () => app.getHttpServer();
  const q = (sql: string, p: any[] = []) => ds.query(sql, p);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const sockets: any[] = [];
  const received: Partial<Record<Key, { event: string; payload: any }[]>> = {};
  const connect = (k: Key) =>
    new Promise<void>((resolve, reject) => {
      received[k] = [];
      const s = io(url, { auth: { token: sign(k) }, transports: ['websocket'], forceNew: true });
      sockets.push(s);
      s.onAny((event: string, payload: any) => received[k]!.push({ event, payload }));
      s.on('connect', () => setTimeout(resolve, 300));
      s.on('connect_error', reject);
    });
  const events = (k: Key, name: string) => (received[k] ?? []).filter((e) => e.event === name).map((e) => e.payload);

  /** Ingreso manual real (empleado del lote A o B) */
  const checkIn = async (key: string, space: string, plate: string, who: Key = 'empA') => {
    const r = await request(srv())
      .post('/api/occupancy/check-in')
      .set(H(who))
      .send({ spaceId: space, vehiclePlate: plate, vehicleType: 'car' })
      .expect(201);
    occ[key] = r.body.id;
    return r.body.id as string;
  };
  const quote = (k: Key, token = tok.outA) => request(srv()).get('/api/occupancy/qr/checkout').query({ token }).set(H(k));
  const payWallet = (k: Key, occupancyId: string, expectedAmountCents: number, key?: string, token = tok.outA) => {
    const r = request(srv()).post('/api/occupancy/qr/checkout/wallet').set(H(k));
    if (key) r.set('Idempotency-Key', key);
    return r.send({ token, occupancyId, expectedAmountCents });
  };
  const askCash = (k: Key, occupancyId: string, token = tok.outA) =>
    request(srv()).post('/api/occupancy/qr/checkout/cash').set(H(k)).send({ token, occupancyId });
  const topUp = (k: Key, amountCents: number) =>
    request(srv()).post('/api/wallet/me/top-ups').set(H(k)).set('Idempotency-Key', randomUUID()).send({ amountCents });
  const balance = async (k: Key) =>
    Number((await q(`SELECT balance_cents FROM wallets WHERE user_id = $1`, [u[k]]))[0]?.balance_cents ?? 0);
  const occRow = async (id: string) =>
    (await q(`SELECT is_completed, checked_out_via_qr, "totalAmount" FROM occupancies WHERE id = $1`, [id]))[0];
  const spaceStatus = async (key: string) => (await q(`SELECT status FROM spaces WHERE id = $1`, [sp[key]]))[0].status;
  const paymentsOf = (occupancyId: string) =>
    q(`SELECT method, status, amount_cents, payer_user_id, registered_by_user_id, parking_lot_id FROM payments WHERE occupancy_id = $1`, [
      occupancyId,
    ]);
  const notifTypes = async (k: Key) =>
    (await q(`SELECT type FROM user_notifications WHERE user_id = $1 ORDER BY created_at`, [u[k]])).map((r: any) => r.type);

  beforeAll(async () => {
    const { AppModule } = require('../../src/app.module');
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.listen(0);
    url = `http://127.0.0.1:${app.getHttpServer().address().port}`;
    ds = app.get(DataSource);

    for (const k of Object.keys(u) as Key[]) {
      await q(`INSERT INTO users (id, email, role) VALUES ($1,$2,$3)`, [u[k], `${k}-${u[k]}@x.com`, role[k]]);
    }
    for (const k of ['c1', 'c2', 'c3', 'c4'] as const) {
      await q(`INSERT INTO client_profiles (id, user_id, name) VALUES ($1,$2,$3)`, [prof[k], u[k], `Cliente ${k.toUpperCase()}`]);
    }
    const poA = randomUUID();
    const poB = randomUUID();
    await q(`INSERT INTO parking_owners (id, user_id, name, business_name) VALUES ($1,$2,'A','A'),($3,$4,'B','B')`, [
      poA,
      u.ownerA,
      poB,
      u.ownerB,
    ]);
    await q(
      `INSERT INTO parking_lots (id, owner_id, name, address, latitude, longitude, open_time, close_time, check_out_token, check_in_token)
       VALUES ($1,$2,'Playa A','Dir A',0,0,'00:00','00:00',$3,$7), ($4,$5,'Playa B','Dir B',0,0,'00:00','00:00',$6,NULL)`,
      [lot.A, poA, tok.outA, lot.B, poB, tok.outB, tok.inA],
    );
    await q(`INSERT INTO parking_employees (id, user_id, parking_lot_id, name) VALUES ($1,$2,$3,'EA'),($4,$5,$6,'EB')`, [
      randomUUID(),
      u.empA,
      lot.A,
      randomUUID(),
      u.empB,
      lot.B,
    ]);
    for (const [k, id] of Object.entries(sp)) {
      await q(
        `INSERT INTO spaces (id, parking_lot_id, space_number, "allowedVehicleTypes", allows_reservations, metadata)
         VALUES ($1,$2,$3,'["car"]',true,'{"floor":1}')`,
        [id, k.startsWith('A') ? lot.A : lot.B, k],
      );
    }
    for (const l of [lot.A, lot.B]) {
      await q(`INSERT INTO rates (id, parking_lot_id, "vehicleType", price_per_hour) VALUES ($1,$2,'car',1000)`, [randomUUID(), l]);
    }

    // c1: dos vehículos; c2: uno; c4: comparte la patente AA111AA con c1 (D2); c3: ninguno
    const addVehicle = (p: string, plate: string) =>
      q(
        `INSERT INTO client_vehicles (client_profile_id, plate, plate_normalized, vehicle_type, brand, model)
         VALUES ($1,$2::varchar,regexp_replace(upper($2::varchar),'[^A-Z0-9]','','g'),'car','Fiat','Cronos')`,
        [p, plate],
      );
    await addVehicle(prof.c1, 'AA 111 AA');
    await addVehicle(prof.c1, 'BB222BB');
    await addVehicle(prof.c2, 'CC333CC');
    await addVehicle(prof.c4, 'aa111aa');

    for (const k of ['ownerA', 'empA', 'empB', 'ownerB', 'c1', 'c4'] as Key[]) await connect(k);
  });

  afterAll(async () => {
    sockets.forEach((s) => s.close());
    await app?.close();
  });

  // ================================================================ vehículo obligatorio
  describe('registro obligatorio de vehículos', () => {
    it('cliente sin vehículos: el backend bloquea checkout QR, reservas y pagos, pero no su perfil', async () => {
      const r = await quote('c3').expect(403);
      expect(r.body.code ?? r.body.message?.code).toBeDefined();
      expect(JSON.stringify(r.body)).toContain('VEHICLE_REQUIRED');
      await request(srv())
        .post('/api/reservations')
        .set(H('c3'))
        .send({ spaceId: sp.A9, vehiclePlate: 'ZZ999ZZ', vehicleType: 'car', startTime: new Date(Date.now() + 3600e3), endTime: new Date(Date.now() + 7200e3) })
        .expect(403);
      await request(srv()).post('/api/payments/wallet').set(H('c3')).send({ obligationType: 'OCCUPANCY', obligationId: randomUUID() }).expect(403);
      // Lo que necesita para registrar el vehículo sigue disponible
      expect((await request(srv()).get('/api/client-vehicles/me').set(H('c3')).expect(200)).body).toEqual([]);
      await request(srv()).get('/api/wallet/me').set(H('c3')).expect(200);
      await request(srv()).get('/api/user-notifications/me').set(H('c3')).expect((res) => expect(res.status).not.toBe(403));
    });

    it('registra su primer vehículo y ya puede usar el checkout', async () => {
      const v = await request(srv()).post('/api/client-vehicles/me').set(H('c3')).send({ plate: 'DD 444 DD', vehicleType: 'car' }).expect(201);
      ids.c3vehicle = v.body.id;
      const r = await quote('c3').expect(200);
      expect(r.body.matches).toEqual([]);
    });

    it('no puede eliminar su único vehículo', async () => {
      const r = await request(srv()).delete(`/api/client-vehicles/me/${ids.c3vehicle}`).set(H('c3')).expect(409);
      expect(r.body.message).toMatch(/al menos un vehículo/);
      expect((await request(srv()).get('/api/client-vehicles/me').set(H('c3'))).body).toHaveLength(1);
    });

    it('con 3 vehículos no puede registrar un cuarto', async () => {
      await request(srv()).post('/api/client-vehicles/me').set(H('c3')).send({ plate: 'EE555EE', vehicleType: 'car' }).expect(201);
      await request(srv()).post('/api/client-vehicles/me').set(H('c3')).send({ plate: 'FF666FF', vehicleType: 'car' }).expect(201);
      await request(srv()).post('/api/client-vehicles/me').set(H('c3')).send({ plate: 'GG777GG', vehicleType: 'car' }).expect(400);
    });

    it('dueño, empleado y administrador no tienen restricciones adicionales', async () => {
      await request(srv()).get(`/api/occupancy/active/${lot.A}`).set(H('ownerA')).expect(200);
      await request(srv()).get(`/api/occupancy/active/${lot.A}`).set(H('empA')).expect(200);
      await request(srv()).get(`/api/occupancy/active/${lot.A}`).set(H('admin')).expect(200);
    });
  });

  // ================================================================ identificación
  describe('checkout QR: identificación automática', () => {
    beforeAll(async () => {
      await checkIn('c1a', sp.A1, 'AA111AA'); // c1 (y c4, misma patente)
      await checkIn('c1b', sp.A2, 'BB-222-BB'); // c1, con otro formato de patente
      await checkIn('c2b', sp.B1, 'CC333CC', 'empB'); // c2 en el lote B
      await checkIn('anon', sp.A3, 'XX000XX'); // sin cliente registrado
    });

    it('identifica todos los vehículos del cliente estacionados en ese lugar, sin pedir patente ni tipo', async () => {
      const r = await quote('c1').expect(200);
      expect(r.body.parkingLot).toMatchObject({ id: lot.A, name: 'Playa A' });
      expect(r.body.matches.map((m: any) => m.occupancyId).sort()).toEqual([occ.c1a, occ.c1b].sort());
      const m = r.body.matches.find((x: any) => x.occupancyId === occ.c1a);
      expect(m).toMatchObject({
        vehiclePlate: 'AA111AA',
        vehicleType: 'car',
        space: { spaceNumber: 'A1', floor: 1 },
        amountCents: 100000,
        billedAmountCents: 100000,
        cashRequest: null,
      });
      expect(m.vehicle).toMatchObject({ brand: 'Fiat', model: 'Cronos' });
      expect(r.body.methods).toEqual({
        wallet: { enabled: true },
        mercadoPago: { enabled: false, comingSoon: true },
        cash: { enabled: true },
      });
      expect(r.body.wallet.balanceCents).toBe(0);
    });

    it('sin coincidencias: no inventa asociaciones', async () => {
      expect((await quote('c2').expect(200)).body.matches).toEqual([]); // su auto está en el lote B
      expect((await quote('c2', tok.outB).expect(200)).body.matches.map((m: any) => m.occupancyId)).toEqual([occ.c2b]);
    });

    it('patente de otro cliente / vehículo de otro estacionamiento: no puede pagar ni pedir la salida', async () => {
      const a = await payWallet('c2', occ.c1a, 100000).expect(403);
      expect(JSON.stringify(a.body)).toContain('CHECKOUT_NO_MATCH');
      await askCash('c2', occ.c1a).expect(403);
      await askCash('c2', occ.anon).expect(403);
      // QR del lote A con una ocupación del lote B
      await askCash('c2', occ.c2b, tok.outA).expect(403);
      expect((await occRow(occ.c1a)).is_completed).toBe(false);
    });

    it('vehículo sin ocupación activa / QR inválido', async () => {
      await askCash('c1', randomUUID()).expect(404);
      await quote('c1', 'token-inexistente').expect(404);
    });

    it('D2: un cliente que tiene registrada la misma patente también la identifica', async () => {
      const r = await quote('c4').expect(200);
      expect(r.body.matches.map((m: any) => m.occupancyId)).toEqual([occ.c1a]);
    });

    it('la salida QR anónima quedó deshabilitada (410) y no cierra nada', async () => {
      await request(srv()).post('/api/occupancy/anonymous/check-out').send({ token: tok.outA, vehiclePlate: 'XX000XX' }).expect(410);
      expect((await occRow(occ.anon)).is_completed).toBe(false);
    });

    it('el cliente no puede enviar importe, patente ni tipo de vehículo', async () => {
      await request(srv())
        .post('/api/occupancy/qr/checkout/cash')
        .set(H('c1'))
        .send({ token: tok.outA, occupancyId: occ.c1a, amountCents: 1 })
        .expect(400);
      await request(srv())
        .post('/api/occupancy/qr/checkout/wallet')
        .set(H('c1'))
        .send({ token: tok.outA, occupancyId: occ.c1a, expectedAmountCents: 100000, vehiclePlate: 'ZZ' })
        .expect(400);
    });
  });

  // ================================================================ billetera
  describe('pago con billetera', () => {
    it('saldo inferior al importe: no cobra ni libera el espacio', async () => {
      await topUp('c1', 50000).expect(201);
      const r = await payWallet('c1', occ.c1a, 100000, randomUUID()).expect(422);
      expect(JSON.stringify(r.body)).toContain('INSUFFICIENT_FUNDS');
      expect((await occRow(occ.c1a)).is_completed).toBe(false);
      expect(await spaceStatus('A1')).toBe('occupied');
      expect(await paymentsOf(occ.c1a)).toEqual([]);
      expect(await balance('c1')).toBe(50000);
    });

    it('importe manipulado / desactualizado: responde AMOUNT_CHANGED y no cobra', async () => {
      await topUp('c1', 50000).expect(201); // saldo = 100000, exactamente el importe
      const r = await payWallet('c1', occ.c1a, 1, randomUUID()).expect(409);
      expect(r.body).toMatchObject({ code: 'AMOUNT_CHANGED', amountCents: 100000 });
      expect(await balance('c1')).toBe(100000);
      expect((await occRow(occ.c1a)).is_completed).toBe(false);
    });

    it('error durante el débito: se revierte también el egreso', async () => {
      const wallet = app.get(WalletService);
      const spy = jest.spyOn(wallet, 'debitLocked').mockRejectedValueOnce(new Error('falla simulada'));
      await payWallet('c1', occ.c1a, 100000, randomUUID()).expect(500);
      spy.mockRestore();
      expect((await occRow(occ.c1a)).is_completed).toBe(false);
      expect(await spaceStatus('A1')).toBe('occupied');
      expect(await paymentsOf(occ.c1a)).toEqual([]);
      expect(await balance('c1')).toBe(100000);
    });

    it('saldo exactamente igual al importe: paga, egresa y registra todo', async () => {
      ids.key1 = randomUUID();
      const r = await payWallet('c1', occ.c1a, 100000, ids.key1).expect(200);
      expect(r.body).toMatchObject({ status: 'PAID', replayed: false, amountCents: 100000, walletBalanceCents: 0, spaceNumber: 'A1' });
      expect(await balance('c1')).toBe(0);
      const o = await occRow(occ.c1a);
      expect(o).toMatchObject({ is_completed: true, checked_out_via_qr: true });
      expect(Number(o.totalAmount)).toBe(1000);
      expect(await spaceStatus('A1')).toBe('available');
      const pays = await paymentsOf(occ.c1a);
      expect(pays).toHaveLength(1);
      expect(pays[0]).toMatchObject({ method: 'WALLET', status: 'APPROVED', payer_user_id: u.c1, parking_lot_id: lot.A });
      expect(Number(pays[0].amount_cents)).toBe(100000);
      const [tx] = await q(`SELECT t.type, t.amount_cents FROM wallet_transactions t WHERE t.payment_id = (SELECT id FROM payments WHERE occupancy_id = $1)`, [occ.c1a]);
      expect(tx.type).toBe('DEBIT');
      const w = app.get(WalletService);
      const [{ id: walletId }] = await q(`SELECT id FROM wallets WHERE user_id = $1`, [u.c1]);
      expect((await w.reconcile(walletId)).ok).toBe(true);
      // Ya no aparece como pendiente de pago ni en la cotización
      expect((await quote('c1')).body.matches.map((m: any) => m.occupancyId)).toEqual([occ.c1b]);
    });

    it('reintento con la misma clave: devuelve el resultado original sin volver a cobrar', async () => {
      await topUp('c1', 300000).expect(201);
      const r = await payWallet('c1', occ.c1a, 100000, ids.key1).expect(200);
      expect(r.body.replayed).toBe(true);
      expect(await balance('c1')).toBe(300000);
      expect(await paymentsOf(occ.c1a)).toHaveLength(1);
    });

    it('doble confirmación con otra clave: no hay segundo cobro ni segundo egreso', async () => {
      const r = await payWallet('c1', occ.c1a, 100000, randomUUID()).expect(409);
      expect(r.body.code).toBe('ALREADY_CHECKED_OUT');
      expect(await balance('c1')).toBe(300000);
      expect(await paymentsOf(occ.c1a)).toHaveLength(1);
    });

    it('dos solicitudes simultáneas: un solo cobro y un solo egreso', async () => {
      const results = await Promise.all([
        payWallet('c1', occ.c1b, 100000, randomUUID()),
        payWallet('c1', occ.c1b, 100000, randomUUID()),
        payWallet('c1', occ.c1b, 100000, randomUUID()),
      ]);
      const codes = results.map((r) => r.status).sort();
      expect(codes.filter((c) => c === 200)).toHaveLength(1);
      expect(codes.filter((c) => c === 409)).toHaveLength(2);
      expect(await paymentsOf(occ.c1b)).toHaveLength(1);
      expect(await balance('c1')).toBe(200000);
    });
  });

  // ================================================================ efectivo
  describe('pago en efectivo', () => {
    beforeAll(async () => {
      await checkIn('cash1', sp.A4, 'AA111AA');
      await checkIn('cash2', sp.A5, 'BB222BB');
      await checkIn('cash3', sp.A6, 'CC333CC'); // c2 en el lote A
    });

    it('el cliente solicita pagar en efectivo: no libera el espacio y avisa solo al personal de ese estacionamiento', async () => {
      const r = await askCash('c1', occ.cash1).expect(201);
      ids.req1 = r.body.id;
      expect(r.body).toMatchObject({ status: 'PENDING', occupancyId: occ.cash1, quotedAmountCents: 100000, mine: true });
      expect((await occRow(occ.cash1)).is_completed).toBe(false);
      expect(await spaceStatus('A4')).toBe('occupied');
      expect(await paymentsOf(occ.cash1)).toEqual([]);

      await wait(1200);
      for (const k of ['ownerA', 'empA'] as Key[]) {
        const ev = events(k, 'checkout:cash-requested').find((e) => e.requestId === ids.req1);
        expect(ev).toMatchObject({
          vehiclePlate: 'AA111AA',
          vehicleType: 'car',
          spaceNumber: 'A4',
          floor: 1,
          clientName: 'Cliente C1',
          quotedAmountCents: 100000,
        });
        expect(await notifTypes(k)).toContain('checkout_cash_requested');
      }
      for (const k of ['empB', 'ownerB', 'c4'] as Key[]) {
        expect(events(k, 'checkout:cash-requested')).toEqual([]);
        expect(await notifTypes(k)).not.toContain('checkout_cash_requested');
      }
      // Un solo aviso persistente por solicitud (sin duplicados)
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM user_notifications WHERE user_id = $1 AND type = 'checkout_cash_requested'`, [u.empA]);
      expect(n).toBe(1);
    });

    it('no se puede generar una segunda solicitud para la misma estadía (ni en paralelo)', async () => {
      const again = await askCash('c1', occ.cash1).expect(409);
      expect(JSON.stringify(again.body)).toContain('CASH_REQUEST_EXISTS');
      // c4 comparte la patente: tampoco puede duplicarla
      await askCash('c4', occ.cash1).expect(409);
      const both = await Promise.all([askCash('c1', occ.cash2), askCash('c1', occ.cash2)]);
      expect(both.map((r) => r.status).sort()).toEqual([201, 409]);
      ids.req2 = both.find((r) => r.status === 201)!.body.id;
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM checkout_requests WHERE occupancy_id = $1`, [occ.cash2]);
      expect(n).toBe(1);
    });

    it('el cliente consulta el estado mientras espera', async () => {
      const r = await request(srv()).get(`/api/occupancy/checkout-requests/${ids.req1}`).set(H('c1')).expect(200);
      expect(r.body).toMatchObject({ status: 'PENDING', checkedOut: false, finalAmountCents: null, spaceNumber: 'A4' });
      const qt = await quote('c1').expect(200);
      expect(qt.body.matches.find((m: any) => m.occupancyId === occ.cash1).cashRequest).toMatchObject({ id: ids.req1, status: 'PENDING', mine: true });
      // otro cliente no ve solicitudes ajenas
      await request(srv()).get(`/api/occupancy/checkout-requests/${ids.req1}`).set(H('c2')).expect(404);
    });

    it('el personal ve la solicitud pendiente con importe y cliente; un empleado ajeno no', async () => {
      const list = await request(srv()).get(`/api/occupancy/checkout-requests/active/${lot.A}`).set(H('empA')).expect(200);
      expect(list.body.map((r: any) => r.id).sort()).toEqual([ids.req1, ids.req2].sort());
      const sq = await request(srv()).get(`/api/occupancy/checkout-quote/${sp.A4}`).set(H('empA')).expect(200);
      expect(sq.body).toMatchObject({ vehiclePlate: 'AA111AA', amountCents: 100000, clientName: 'Cliente C1', cashRequest: { id: ids.req1 } });
      await request(srv()).get(`/api/occupancy/checkout-requests/active/${lot.A}`).set(H('empB')).expect(403);
      await request(srv()).get(`/api/occupancy/checkout-quote/${sp.A4}`).set(H('empB')).expect(403);
      await request(srv()).get(`/api/occupancy/checkout-quote/${sp.A4}`).set(H('ownerB')).expect(403);
      await request(srv()).get(`/api/occupancy/checkout-quote/${sp.A4}`).set(H('c1')).expect(403);
    });

    it('permisos: empleado o dueño ajeno no puede registrar el egreso; un cliente no puede confirmar pagos', async () => {
      await request(srv()).post('/api/occupancy/check-out').set(H('empB')).send({ spaceId: sp.A4, paymentReceived: true }).expect(403);
      await request(srv()).post('/api/occupancy/check-out').set(H('ownerB')).send({ spaceId: sp.A4, paymentReceived: true }).expect(403);
      await request(srv()).post('/api/occupancy/check-out').set(H('c1')).send({ spaceId: sp.A4, paymentReceived: true }).expect(403);
      await request(srv()).post('/api/payments/staff/presential').set(H('c1')).send({ obligationType: 'OCCUPANCY', obligationId: occ.cash1 }).expect(403);
      // el importe no se puede enviar desde el frontend
      await request(srv()).post('/api/occupancy/check-out').set(H('empA')).send({ spaceId: sp.A4, paymentReceived: true, totalAmount: 1 }).expect(400);
      expect((await occRow(occ.cash1)).is_completed).toBe(false);
    });

    it('el empleado confirma el cobro y registra el egreso (A)', async () => {
      const r = await request(srv()).post('/api/occupancy/check-out').set(H('empA')).send({ spaceId: sp.A4, paymentReceived: true }).expect(201);
      expect(r.body.checkout).toMatchObject({ paymentStatus: 'APPROVED', paymentReceived: true, amountCents: 100000, checkoutRequestId: ids.req1 });
      expect(r.body.occupancy.totalAmount).toBe(1000);
      const pays = await paymentsOf(occ.cash1);
      expect(pays).toHaveLength(1);
      expect(pays[0]).toMatchObject({ method: 'PRESENTIAL', status: 'APPROVED', payer_user_id: u.c1, registered_by_user_id: u.empA });
      const [req] = await q(`SELECT status, resolved_by_user_id FROM checkout_requests WHERE id = $1`, [ids.req1]);
      expect(req).toEqual({ status: 'COMPLETED_PAID', resolved_by_user_id: u.empA });
      await wait(1200);
      expect(events('c1', 'checkout:status').find((e) => e.requestId === ids.req1)?.status).toBe('COMPLETED_PAID');
      const st = await request(srv()).get(`/api/occupancy/checkout-requests/${ids.req1}`).set(H('c1')).expect(200);
      expect(st.body).toMatchObject({ status: 'COMPLETED_PAID', checkedOut: true, finalAmountCents: 100000, payment: { status: 'APPROVED', method: 'PRESENTIAL' } });
      // un segundo egreso de la misma estadía no es posible
      await request(srv()).post('/api/occupancy/check-out').set(H('empA')).send({ spaceId: sp.A4, paymentReceived: true }).expect(404);
      expect(await paymentsOf(occ.cash1)).toHaveLength(1);
    });

    it('el empleado registra el egreso SIN confirmar el pago (B): queda pendiente, no cobrado', async () => {
      const r = await request(srv()).post('/api/occupancy/check-out').set(H('empA')).send({ spaceId: sp.A5 }).expect(201);
      expect(r.body.checkout).toMatchObject({ paymentStatus: 'PENDING', paymentReceived: false, amountCents: 100000, checkoutRequestId: ids.req2 });
      expect(await paymentsOf(occ.cash2)).toEqual([]);
      const [req] = await q(`SELECT status FROM checkout_requests WHERE id = $1`, [ids.req2]);
      expect(req.status).toBe('COMPLETED_UNPAID');
      await wait(1200);
      expect(events('c1', 'checkout:status').find((e) => e.requestId === ids.req2)?.status).toBe('COMPLETED_UNPAID');
      expect(await notifTypes('c1')).toContain('checkout_unpaid');
      const st = await request(srv()).get(`/api/occupancy/checkout-requests/${ids.req2}`).set(H('c1')).expect(200);
      expect(st.body).toMatchObject({ status: 'COMPLETED_UNPAID', checkedOut: true, payment: { status: 'NONE' } });
      // La deuda queda visible para el cliente y la puede pagar después (modelo existente, D6)
      const payable = await request(srv()).get('/api/payments/me/payable').set(H('c1')).expect(200);
      expect(payable.body.find((p: any) => p.obligationId === occ.cash2)).toMatchObject({ obligationType: 'OCCUPANCY', amountCents: 100000 });
      const staffStatus = await request(srv()).get(`/api/payments/staff/parking-lot/${lot.A}/status`).query({ occupancyId: occ.cash2 }).set(H('ownerA')).expect(200);
      expect(staffStatus.body).toMatchObject({ status: 'NONE', amountCents: 100000 });
      // pago posterior de la deuda con la billetera
      const before = await balance('c1');
      await request(srv()).post('/api/payments/wallet').set(H('c1')).send({ obligationType: 'OCCUPANCY', obligationId: occ.cash2 }).expect(201);
      expect(await balance('c1')).toBe(before - 100000);
      expect((await paymentsOf(occ.cash2))[0]).toMatchObject({ method: 'WALLET', status: 'APPROVED' });
    });

    it('el dueño confirma el cobro y registra el egreso', async () => {
      const r = await askCash('c2', occ.cash3).expect(201);
      const out = await request(srv()).post('/api/occupancy/check-out').set(H('ownerA')).send({ spaceId: sp.A6, paymentReceived: true }).expect(201);
      expect(out.body.checkout).toMatchObject({ paymentStatus: 'APPROVED', checkoutRequestId: r.body.id });
      const pays = await paymentsOf(occ.cash3);
      expect(pays[0]).toMatchObject({ method: 'PRESENTIAL', status: 'APPROVED', payer_user_id: u.c2, registered_by_user_id: u.ownerA });
    });

    it('el dueño registra el egreso sin confirmar el pago (sin solicitud previa)', async () => {
      await checkIn('own2', sp.A7, 'XY123ZZ');
      const out = await request(srv()).post('/api/occupancy/check-out').set(H('ownerA')).send({ spaceId: sp.A7, paymentReceived: false }).expect(201);
      expect(out.body.checkout).toMatchObject({ paymentStatus: 'PENDING', paymentReceived: false, checkoutRequestId: null });
      expect(await paymentsOf(occ.own2)).toEqual([]);
    });

    it('cancelar la solicitud y pasar a pagar con la billetera', async () => {
      await checkIn('cash4', sp.A8, 'AA111AA');
      const r = await askCash('c1', occ.cash4).expect(201);
      await request(srv()).post(`/api/occupancy/checkout-requests/${r.body.id}/cancel`).set(H('c4')).expect(404);
      const c = await request(srv()).post(`/api/occupancy/checkout-requests/${r.body.id}/cancel`).set(H('c1')).expect(200);
      expect(c.body.status).toBe('CANCELLED');
      await request(srv()).post(`/api/occupancy/checkout-requests/${r.body.id}/cancel`).set(H('c1')).expect(409);
      await wait(800);
      expect(events('empA', 'checkout:request-updated').find((e) => e.requestId === r.body.id)?.status).toBe('CANCELLED');
      // nueva solicitud y pago con billetera mientras está pendiente: se resuelve como COMPLETED_WALLET
      const again = await askCash('c1', occ.cash4).expect(201);
      await payWallet('c1', occ.cash4, 100000, randomUUID()).expect(200);
      const [req] = await q(`SELECT status, payment_id FROM checkout_requests WHERE id = $1`, [again.body.id]);
      expect(req.status).toBe('COMPLETED_WALLET');
      expect(req.payment_id).toBeTruthy();
      expect(await spaceStatus('A8')).toBe('available');
    });

    it('egreso del personal y pago del cliente al mismo tiempo: un solo egreso y a lo sumo un cobro', async () => {
      await checkIn('race', sp.A9, 'BB222BB');
      const [client, staff] = await Promise.all([
        payWallet('c1', occ.race, 100000, randomUUID()),
        request(srv()).post('/api/occupancy/check-out').set(H('empA')).send({ spaceId: sp.A9, paymentReceived: true }),
      ]);
      const ok = [client.status === 200, staff.status === 201].filter(Boolean);
      expect(ok).toHaveLength(1);
      const pays = await paymentsOf(occ.race);
      expect(pays.filter((p: any) => p.status === 'APPROVED')).toHaveLength(1);
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM occupancies WHERE id = $1 AND is_completed = true`, [occ.race]);
      expect(n).toBe(1);
    });

    it('egreso sin ocupación válida / administrador sin cambios', async () => {
      await request(srv()).post('/api/occupancy/check-out').set(H('empA')).send({ spaceId: sp.A9 }).expect(404);
      await request(srv()).post('/api/occupancy/check-out').set(H('empA')).send({ spaceId: randomUUID() }).expect(404);
      await checkIn('adm', sp.A9, 'AD111MN');
      const r = await request(srv()).post('/api/occupancy/check-out').set(H('admin')).send({ spaceId: sp.A9 }).expect(201);
      expect(r.body.checkout).toBeUndefined();
    });

    it('el empleado ya no puede operar ingresos ni ver ocupaciones de otro estacionamiento', async () => {
      await request(srv()).post('/api/occupancy/check-in').set(H('empB')).send({ spaceId: sp.A1, vehiclePlate: 'ZZ1', vehicleType: 'car' }).expect(403);
      await request(srv()).get(`/api/occupancy/active/${lot.A}`).set(H('empB')).expect(403);
      await request(srv()).get(`/api/occupancy/active/${lot.A}`).set(H('ownerB')).expect(403);
    });
  });

  // ================================================================ ingreso por QR del cliente
  describe('ingreso por QR con un vehículo del perfil', () => {
    const options = (k: Key) => request(srv()).get('/api/occupancy/qr/check-in/vehicles').query({ token: tok.inA }).set(H(k));
    const qrIn = (k: Key, vehicleId: string) =>
      request(srv()).post('/api/occupancy/qr/check-in').set(H(k)).send({ token: tok.inA, vehicleId });

    it('ofrece solo los vehículos del propio cliente, con su tipo y si hay tarifa', async () => {
      const r = await options('c4').expect(200);
      expect(r.body.parkingLot.name).toBe('Playa A');
      expect(r.body.vehicles).toHaveLength(1);
      expect(r.body.vehicles[0]).toMatchObject({ plate: 'aa111aa', vehicleType: 'car', hasRate: true, pricePerHour: 1000, parkedAt: null, available: true });
      ids.c4car = r.body.vehicles[0].id;
      // c1 también tiene registrada esa patente, pero no ve los vehículos de c4 ni c4 los de c1
      const c1 = await options('c1').expect(200);
      expect(c1.body.vehicles.map((v: any) => v.id)).not.toContain(ids.c4car);
      ids.c1vehicle = c1.body.vehicles[0].id;
    });

    it('no permite ingresar con un vehículo de otro usuario', async () => {
      const r = await qrIn('c4', ids.c1vehicle).expect(403);
      expect(r.body.code).toBe('VEHICLE_NOT_OWNED');
    });

    it('el ingreso usa la patente y el tipo del vehículo registrado: coincide en el panel y en la tarifa', async () => {
      const r = await qrIn('c4', ids.c4car).expect(201);
      expect(r.body).toMatchObject({ success: true, vehiclePlate: 'AA111AA', vehicle: { id: ids.c4car, vehicleType: 'car' } });
      const [o] = await q(
        `SELECT o.id, o.vehicle_plate, o."vehicleType" AS type, o.is_anonymous, o.checked_in_via_qr, s.occupied_by_vehicle_plate AS sp_plate
           FROM occupancies o JOIN spaces s ON s.id = o.space_id WHERE o.vehicle_plate = 'AA111AA' AND o.is_completed = false`,
      );
      expect(o).toMatchObject({ vehicle_plate: 'AA111AA', type: 'car', is_anonymous: false, checked_in_via_qr: true, sp_plate: 'AA111AA' });
      ids.c4occ = o.id;
      const active = await request(srv()).get(`/api/occupancy/active/${lot.A}`).set(H('empA')).expect(200);
      expect(active.body.find((a: any) => a.id === ids.c4occ)).toMatchObject({ vehiclePlate: 'AA111AA', vehicleType: 'car' });
      // tarifa congelada del tipo del vehículo (auto: $1000/h) y salida identificada
      const qt = await quote('c4').expect(200);
      expect(qt.body.matches.find((m: any) => m.occupancyId === ids.c4occ)).toMatchObject({ vehicleType: 'car', amountCents: 100000 });
    });

    it('un vehículo con ingreso activo no puede volver a ingresar (ni en otro estacionamiento)', async () => {
      expect((await qrIn('c4', ids.c4car).expect(409)).body.code).toBe('VEHICLE_ALREADY_PARKED');
      const c2 = await options('c2').expect(200);
      expect(c2.body.vehicles[0]).toMatchObject({ plate: 'CC333CC', parkedAt: 'Playa B', available: false });
      await qrIn('c2', c2.body.vehicles[0].id).expect(409);
    });

    it('sin tarifa para el tipo del vehículo: se informa y no ingresa', async () => {
      const moto = await request(srv()).post('/api/client-vehicles/me').set(H('c4')).send({ plate: 'MO123TO', vehicleType: 'motorcycle' }).expect(201);
      const r = await options('c4').expect(200);
      expect(r.body.vehicles.find((v: any) => v.id === moto.body.id)).toMatchObject({ hasRate: false, available: false });
      await qrIn('c4', moto.body.id).expect(400);
    });

    it('con sesión de cliente no se puede ingresar escribiendo una patente; sin cuenta sigue funcionando', async () => {
      const blocked = await request(srv())
        .post('/api/occupancy/anonymous/check-in')
        .set(H('c1'))
        .send({ token: tok.inA, vehiclePlate: 'ZZ123ZZ', vehicleType: 'car' })
        .expect(403);
      expect(blocked.body.code).toBe('QR_USE_REGISTERED_VEHICLE');
      await request(srv()).post('/api/occupancy/anonymous/check-in').send({ token: tok.inA, vehiclePlate: 'ZZ123ZZ', vehicleType: 'car' }).expect(201);
    });

    it('QR inválido o cliente sin token', async () => {
      await request(srv()).get('/api/occupancy/qr/check-in/vehicles').query({ token: 'nope' }).set(H('c4')).expect(404);
      await request(srv()).post('/api/occupancy/qr/check-in').send({ token: tok.inA, vehicleId: ids.c4car }).expect(401);
      await request(srv()).post('/api/occupancy/qr/check-in').set(H('empA')).send({ token: tok.inA, vehicleId: ids.c4car }).expect(403);
    });
  });
});
