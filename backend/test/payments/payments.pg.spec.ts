/**
 * E2E con PostgreSQL real (embedded-postgres) y la AppModule completa:
 * billetera demo, pagos con saldo, pago presencial, Mercado Pago Sandbox
 * (cliente HTTP falso, firmas reales), finanzas del dueño, actividad y D6.
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
process.env.MP_ACCESS_TOKEN = 'TEST-fake-access-token-123';
process.env.MP_WEBHOOK_SECRET = 'whsec_test';
process.env.MP_NOTIFICATION_URL = 'https://example.test/api/payments/mercadopago/webhook';
process.env.MP_SANDBOX = 'true';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { createHmac, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { MercadoPagoClient } from '../../src/modules/payments/mercadopago/mercadopago.client';
import { MercadoPagoService } from '../../src/modules/payments/mercadopago/mercadopago.service';

jest.setTimeout(180000);

const TOKEN = process.env.MP_ACCESS_TOKEN!;

/** Mercado Pago falso: misma interfaz que MercadoPagoClient, sin red */
const mp = {
  prefs: [] as any[],
  payments: new Map<string, any>(),
  createPreference: jest.fn(async (input: any) => {
    mp.prefs.push(input);
    const n = mp.prefs.length;
    return {
      id: `pref-${n}`,
      init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-${n}`,
      sandbox_init_point: `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-${n}`,
    };
  }),
  getPayment: jest.fn(async (id: string) => {
    const p = mp.payments.get(String(id));
    if (!p) throw new Error('404');
    return p;
  }),
  searchByExternalReference: jest.fn(async (ref: string) =>
    [...mp.payments.values()].filter((p) => p.external_reference === ref).reverse(),
  ),
  add(id: string, ref: string, status: string, amount: number, extra: Record<string, unknown> = {}) {
    mp.payments.set(id, {
      id: Number(id),
      status,
      status_detail: status === 'approved' ? 'accredited' : status === 'rejected' ? 'cc_rejected_other_reason' : 'pending_contingency',
      external_reference: ref,
      transaction_amount: amount,
      currency_id: 'ARS',
      live_mode: false,
      date_approved: status === 'approved' ? new Date().toISOString() : null,
      ...extra,
    });
  },
};

describe('Billetera demo + pagos (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const u = {
    ownerA: randomUUID(),
    ownerB: randomUUID(),
    empA: randomUUID(),
    empB: randomUUID(),
    client1: randomUUID(),
    client2: randomUUID(),
    admin: randomUUID(),
  };
  const cp = { c1: randomUUID(), c2: randomUUID() };
  const lot = { A: randomUUID(), B: randomUUID() };
  const sp: Record<string, string> = {};
  const res: Record<string, string> = {};
  const ids: Record<string, string> = {};
  const auth = (sub: string, role: string) => ({
    Authorization: `Bearer ${jwt.sign({ sub, email: `${sub}@x.com`, role }, 'test-secret')}`,
  });
  const H = {
    ownerA: () => auth(u.ownerA, 'parking_owner'),
    ownerB: () => auth(u.ownerB, 'parking_owner'),
    empA: () => auth(u.empA, 'parking_employee'),
    empB: () => auth(u.empB, 'parking_employee'),
    c1: () => auth(u.client1, 'client'),
    c2: () => auth(u.client2, 'client'),
    admin: () => auth(u.admin, 'admin'),
  };
  const srv = () => app.getHttpServer();
  const q = (sql: string, p: any[] = []) => ds.query(sql, p);
  const balance = async (userId: string) =>
    Number((await q(`SELECT balance_cents FROM wallets WHERE user_id = $1`, [userId]))[0]?.balance_cents ?? 0);
  const pay = (h: () => any, obligationType: string, obligationId: string, key?: string) => {
    const r = request(srv()).post('/api/payments/wallet').set(h());
    if (key) r.set('Idempotency-Key', key);
    return r.send({ obligationType, obligationId });
  };
  const startMp = (h: () => any, obligationType: string, obligationId: string) =>
    request(srv()).post('/api/payments/mercadopago').set(h()).send({ obligationType, obligationId });

  /** Ingreso + egreso reales (OccupancyService + calculadora de servicios) */
  const stay = async (spaceId: string, plate: string, serviceKeys?: string[]) => {
    const r = await request(srv())
      .post('/api/occupancy/check-in')
      .set(H.empA())
      .send({ spaceId, vehiclePlate: plate, vehicleType: 'car', ...(serviceKeys ? { serviceKeys } : {}) })
      .expect(201);
    const out = await request(srv()).post('/api/occupancy/check-out').set(H.empA()).send({ spaceId }).expect(201);
    return { id: r.body.id as string, out: out.body };
  };

  const webhook = (mpId: string, opts: { secret?: string; badSig?: boolean; noSig?: boolean } = {}) => {
    const ts = String(Date.now());
    const reqId = randomUUID();
    const v1 = createHmac('sha256', opts.secret ?? 'whsec_test').update(`id:${mpId};request-id:${reqId};ts:${ts};`).digest('hex');
    const r = request(srv()).post(`/api/payments/mercadopago/webhook?data.id=${mpId}&type=payment`);
    if (!opts.noSig) r.set('x-signature', `ts=${ts},v1=${opts.badSig ? 'ab'.repeat(32) : v1}`).set('x-request-id', reqId);
    return r.send({ action: 'payment.updated', type: 'payment', data: { id: mpId }, live_mode: false });
  };

  beforeAll(async () => {
    const { AppModule } = require('../../src/app.module');
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MercadoPagoClient)
      .useValue(mp)
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    ds = app.get(DataSource);

    for (const [id, role] of Object.entries({
      [u.ownerA]: 'parking_owner',
      [u.ownerB]: 'parking_owner',
      [u.empA]: 'parking_employee',
      [u.empB]: 'parking_employee',
      [u.client1]: 'client',
      [u.client2]: 'client',
      [u.admin]: 'admin',
    })) {
      await q(`INSERT INTO users (id, email, role) VALUES ($1,$2,$3)`, [id, `${id}@x.com`, role]);
    }
    await q(`INSERT INTO client_profiles (id, user_id, name) VALUES ($1,$2,'C1'),($3,$4,'C2')`, [cp.c1, u.client1, cp.c2, u.client2]);
    const poA = randomUUID();
    const poB = randomUUID();
    await q(`INSERT INTO parking_owners (id, user_id, name, business_name) VALUES ($1,$2,'A','A'),($3,$4,'B','B')`, [
      poA,
      u.ownerA,
      poB,
      u.ownerB,
    ]);
    await q(
      `INSERT INTO parking_lots (id, owner_id, name, address, latitude, longitude, open_time, close_time)
       VALUES ($1,$2,'Lote A','Dir A',0,0,'00:00','00:00'), ($3,$4,'Lote B','Dir B',0,0,'00:00','00:00')`,
      [lot.A, poA, lot.B, poB],
    );
    await q(`INSERT INTO parking_employees (id, user_id, parking_lot_id, name) VALUES ($1,$2,$3,'EA'),($4,$5,$6,'EB')`, [
      randomUUID(),
      u.empA,
      lot.A,
      randomUUID(),
      u.empB,
      lot.B,
    ]);
    for (const [key, l] of [
      ['A1', lot.A],
      ['A2', lot.A],
      ['A3', lot.A],
      ['A4', lot.A],
      ['A5', lot.A],
      ['A6', lot.A],
      ['B1', lot.B],
    ]) {
      sp[key] = randomUUID();
      await q(
        `INSERT INTO spaces (id, parking_lot_id, space_number, "allowedVehicleTypes", allows_reservations) VALUES ($1,$2,$3,'["car"]',true)`,
        [sp[key], l, key],
      );
    }
    for (const l of [lot.A, lot.B]) {
      await q(`INSERT INTO rates (id, parking_lot_id, "vehicleType", price_per_hour) VALUES ($1,$2,'car',1000)`, [randomUUID(), l]);
    }
    // Servicios: lavado con cargo adicional + guarda de casco incluida
    await request(srv())
      .put(`/api/parking-profiles/${lot.A}`)
      .set(H.ownerA())
      .send({
        services: [
          { code: 'car_wash', enabled: true, pricing: { type: 'extra_cost', amount: 2000, unit: 'per_vehicle' } },
          { code: 'helmet_storage', enabled: true, pricing: { type: 'included' } },
        ],
      })
      .expect(200);

    // Reservas (insertadas con el estado que necesita cada caso)
    const start = new Date(Date.now() + 3 * 3600_000);
    const end = new Date(Date.now() + 5 * 3600_000);
    const addRes = async (key: string, client: string, space: string, status: string, total: string, plate = 'RES111') => {
      res[key] = randomUUID();
      await q(
        `INSERT INTO reservations (id, client_id, space_id, "vehicleType", vehicle_plate, start_time, end_time, status, total_amount)
         VALUES ($1,$2,$3,'car',$4,$5,$6,$7,$8)`,
        [res[key], client, space, plate, start, end, status, total],
      );
    };
    await addRes('confirmed', cp.c1, sp.A2, 'confirmed', '3000.00');
    await addRes('pending', cp.c1, sp.A2, 'pending_confirmation', '3000.00');
    await addRes('big', cp.c1, sp.A2, 'confirmed', '100000.00');
    await addRes('dup', cp.c1, sp.A2, 'confirmed', '1000.00');
    await addRes('other', cp.c2, sp.B1, 'confirmed', '2000.00', 'RES222');
    await addRes('c2a', cp.c2, sp.B1, 'confirmed', '100.00', 'RES222');
    await addRes('c2b', cp.c2, sp.B1, 'confirmed', '100.00', 'RES222');
  });

  afterAll(async () => app?.close());

  // ===================================================================== billetera
  describe('billetera demo', () => {
    it('cliente nuevo obtiene una única billetera, aun con pedidos simultáneos', async () => {
      const all = await Promise.all([1, 2, 3, 4, 5].map(() => request(srv()).get('/api/wallet/me').set(H.c1())));
      all.forEach((r) => expect(r.status).toBe(200));
      expect(new Set(all.map((r) => r.body.id)).size).toBe(1);
      expect(all[0].body).toMatchObject({ balanceCents: 0, currency: 'ARS', isDemo: true, totalLoadedCents: 0, totalSpentCents: 0 });
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM wallets WHERE user_id = $1`, [u.client1]);
      expect(n).toBe(1);
    });

    it('dueños, empleados y admin no tienen billetera', async () => {
      for (const h of [H.ownerA, H.empA, H.admin]) {
        await request(srv()).get('/api/wallet/me').set(h()).expect(403);
        await request(srv()).post('/api/wallet/me/top-ups').set(h()).send({ amountCents: 500000 }).expect(403);
      }
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM wallets WHERE user_id = ANY($1::uuid[])`, [[u.ownerA, u.empA, u.admin]]);
      expect(n).toBe(0);
    });

    it('rechaza cargas negativas, nulas, con decimales, fuera de rango o con campos extra', async () => {
      for (const amountCents of [-100, 0, 100.5, 5000, 60_000_000, 'abc']) {
        await request(srv()).post('/api/wallet/me/top-ups').set(H.c1()).send({ amountCents }).expect(400);
      }
      await request(srv()).post('/api/wallet/me/top-ups').set(H.c1()).send({ amountCents: 500000, balanceCents: 999999999 }).expect(400);
      expect(await balance(u.client1)).toBe(0);
    });

    it('la carga registra un crédito y actualiza el saldo; el reintento con la misma clave no duplica', async () => {
      const r1 = await request(srv()).post('/api/wallet/me/top-ups').set(H.c1()).set('Idempotency-Key', 'topup-c1-0001').send({ amountCents: 500000 }).expect(201);
      expect(r1.body.wallet.balanceCents).toBe(500000);
      expect(r1.body.transaction).toMatchObject({ type: 'CREDIT', kind: 'DEMO_TOPUP', amountCents: 500000, balanceAfterCents: 500000 });
      const r2 = await request(srv()).post('/api/wallet/me/top-ups').set(H.c1()).set('Idempotency-Key', 'topup-c1-0001').send({ amountCents: 500000 }).expect(201);
      expect(r2.body.replayed).toBe(true);
      expect(await balance(u.client1)).toBe(500000);
      await request(srv()).post('/api/wallet/me/top-ups').set(H.c1()).send({ amountCents: 1000000 }).expect(201);
      expect(await balance(u.client1)).toBe(1500000);
    });

    it('no existe ningún endpoint para fijar el saldo', async () => {
      await request(srv()).patch('/api/wallet/me').set(H.c1()).send({ balanceCents: 1 }).expect(404);
      await request(srv()).put('/api/wallet/me').set(H.c1()).send({ balanceCents: 1 }).expect(404);
      await request(srv()).delete('/api/wallet/me/transactions').set(H.c1()).expect(404);
      expect(await balance(u.client1)).toBe(1500000);
    });

    it('historial de movimientos de solo lectura, cada cliente ve el suyo', async () => {
      const r = await request(srv()).get('/api/wallet/me/transactions').set(H.c1()).expect(200);
      expect(r.body.total).toBe(2);
      expect(r.body.items[0]).toMatchObject({ type: 'CREDIT', amountCents: 1000000, balanceAfterCents: 1500000 });
      const other = await request(srv()).get('/api/wallet/me/transactions').set(H.c2()).expect(200);
      expect(other.body.total).toBe(0);
    });
  });

  // ===================================================================== reservas
  describe('pago de reservas con saldo', () => {
    it('solo se pueden pagar reservas confirmadas (D2)', async () => {
      const r = await pay(H.c1, 'RESERVATION', res.pending).expect(409);
      expect(r.body.code).toBe('NOT_PAYABLE');
    });

    it('un cliente no puede pagar operaciones de otro', async () => {
      await pay(H.c2, 'RESERVATION', res.confirmed).expect(403);
      await pay(H.c1, 'RESERVATION', res.other).expect(403);
    });

    it('saldo insuficiente: no paga, no debita y ofrece Mercado Pago', async () => {
      const r = await pay(H.c1, 'RESERVATION', res.big).expect(422);
      expect(r.body).toMatchObject({ code: 'INSUFFICIENT_FUNDS', canUseMercadoPago: true, amountCents: 10000000 });
      expect(await balance(u.client1)).toBe(1500000);
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM payments WHERE reservation_id = $1`, [res.big]);
      expect(n).toBe(0);
    });

    it('pago con saldo: débito, movimiento y pago aprobado; la reserva no cambia de estado', async () => {
      const r = await pay(H.c1, 'RESERVATION', res.confirmed, 'payres-c1-0001').expect(201);
      expect(r.body.payment).toMatchObject({ status: 'APPROVED', method: 'WALLET', amountCents: 300000, billedAmountCents: 300000 });
      expect(r.body.walletBalanceCents).toBe(1200000);
      const [tx] = await q(`SELECT type, amount_cents, balance_after_cents FROM wallet_transactions WHERE payment_id = $1`, [r.body.payment.id]);
      expect(tx).toMatchObject({ type: 'DEBIT', amount_cents: '300000', balance_after_cents: '1200000' });
      const [rs] = await q(`SELECT status FROM reservations WHERE id = $1`, [res.confirmed]);
      expect(rs.status).toBe('confirmed');
      ids.payResConfirmed = r.body.payment.id;
      // Reintento con la misma Idempotency-Key: devuelve el mismo pago sin debitar
      const again = await pay(H.c1, 'RESERVATION', res.confirmed, 'payres-c1-0001').expect(201);
      expect(again.body.replayed).toBe(true);
      expect(again.body.payment.id).toBe(ids.payResConfirmed);
      expect(await balance(u.client1)).toBe(1200000);
    });

    it('no permite pagar dos veces la misma reserva', async () => {
      const r = await pay(H.c1, 'RESERVATION', res.confirmed).expect(409);
      expect(r.body.code).toBe('ALREADY_PAID');
      expect(await balance(u.client1)).toBe(1200000);
    });

    it('concurrencia: dos pagos simultáneos de la misma reserva generan un solo débito', async () => {
      const results = await Promise.all([pay(H.c1, 'RESERVATION', res.dup), pay(H.c1, 'RESERVATION', res.dup)]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM payments WHERE reservation_id = $1 AND status = 'APPROVED'`, [res.dup]);
      expect(n).toBe(1);
      expect(await balance(u.client1)).toBe(1100000);
    });

    it('concurrencia: con saldo para un solo pago, el segundo se rechaza y el saldo nunca es negativo', async () => {
      await request(srv()).post('/api/wallet/me/top-ups').set(H.c2()).send({ amountCents: 15000 }).expect(201);
      const results = await Promise.all([pay(H.c2, 'RESERVATION', res.c2a), pay(H.c2, 'RESERVATION', res.c2b)]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 422]);
      expect(await balance(u.client2)).toBe(5000);
    });
  });

  // ===================================================================== egresos
  describe('egresos: el importe es el facturado por EstacionApp', () => {
    it('no se puede pagar mientras el vehículo sigue adentro', async () => {
      await request(srv()).post('/api/client-vehicles/me').set(H.c1()).send({ plate: 'AAA111', vehicleType: 'car' }).expect(201);
      const r = await request(srv())
        .post('/api/occupancy/check-in')
        .set(H.empA())
        .send({ spaceId: sp.A1, vehiclePlate: 'AAA111', vehicleType: 'car', serviceKeys: ['catalog:car_wash', 'catalog:helmet_storage'] })
        .expect(201);
      ids.occWash = r.body.id;
      const p = await pay(H.c1, 'OCCUPANCY', ids.occWash).expect(409);
      expect(p.body.code).toBe('NOT_PAYABLE');
    });

    it('estacionamiento + adicional facturable, sin cobrar el servicio incluido', async () => {
      const out = await request(srv()).post('/api/occupancy/check-out').set(H.empA()).send({ spaceId: sp.A1 }).expect(201);
      expect(out.body.breakdown).toMatchObject({ parkingAmount: 1000, servicesAmount: 2000, total: 3000 });
      const [occ] = await q(`SELECT "totalAmount" FROM occupancies WHERE id = $1`, [ids.occWash]);
      expect(Number(occ.totalAmount)).toBe(3000);

      const payable = await request(srv()).get('/api/payments/me/payable').set(H.c1()).expect(200);
      const item = payable.body.find((i: any) => i.obligationId === ids.occWash);
      expect(item).toMatchObject({ obligationType: 'OCCUPANCY', amountCents: 300000, billedAmountCents: 300000, vehiclePlate: 'AAA111' });

      const r = await pay(H.c1, 'OCCUPANCY', ids.occWash).expect(201);
      expect(r.body.payment.amountCents).toBe(Number(occ.totalAmount) * 100);
      ids.payWash = r.body.payment.id;
    });

    it('un cambio posterior de tarifa no altera pagos históricos', async () => {
      await q(`UPDATE rates SET price_per_hour = 9999 WHERE parking_lot_id = $1`, [lot.A]);
      const r = await request(srv()).get(`/api/payments/me/${ids.payWash}`).set(H.c1()).expect(200);
      expect(r.body).toMatchObject({ amountCents: 300000, billedAmountCents: 300000, status: 'APPROVED' });
      await q(`UPDATE rates SET price_per_hour = 1000 WHERE parking_lot_id = $1`, [lot.A]);
    });
  });

  // ===================================================================== D3
  describe('reserva pagada + egreso: se cobra solo la diferencia (D3)', () => {
    it('egreso de $5.000 con reserva pagada de $3.000 => cobra $2.000', async () => {
      ids.occD3 = randomUUID();
      await q(
        `INSERT INTO occupancies (id, space_id, reservation_id, vehicle_plate, "vehicleType", check_in_time, check_out_time, "totalAmount", is_completed)
         VALUES ($1,$2,$3,'RES111','car', now() - interval '3 hours', now(), 5000.00, true)`,
        [ids.occD3, sp.A2, res.confirmed],
      );
      const payable = await request(srv()).get('/api/payments/me/payable').set(H.c1()).expect(200);
      expect(payable.body.find((i: any) => i.obligationId === ids.occD3)).toMatchObject({
        billedAmountCents: 500000,
        coveredAmountCents: 300000,
        amountCents: 200000,
      });
      const r = await pay(H.c1, 'OCCUPANCY', ids.occD3).expect(201);
      expect(r.body.payment).toMatchObject({ amountCents: 200000, billedAmountCents: 500000, coveredAmountCents: 300000 });
    });

    it('si la reserva cubre todo el egreso no hay nada que cobrar', async () => {
      ids.occCovered = randomUUID();
      await q(
        `INSERT INTO occupancies (id, space_id, reservation_id, vehicle_plate, "vehicleType", check_in_time, check_out_time, "totalAmount", is_completed)
         VALUES ($1,$2,$3,'RES111','car', now() - interval '1 hour', now(), 1000.00, true)`,
        [ids.occCovered, sp.A2, res.dup],
      );
      const r = await pay(H.c1, 'OCCUPANCY', ids.occCovered).expect(409);
      expect(r.body.code).toBe('NOTHING_TO_PAY');
      const st = await request(srv())
        .get(`/api/payments/staff/parking-lot/${lot.A}/status`)
        .query({ occupancyId: ids.occCovered })
        .set(H.empA())
        .expect(200);
      expect(st.body.status).toBe('COVERED');
    });
  });

  // ===================================================================== D4
  describe('pago presencial (D4)', () => {
    it('solo dueño o empleado del estacionamiento pueden registrarlo', async () => {
      ids.occCash = (await stay(sp.A3, 'AAA111')).id;
      const body = { obligationType: 'OCCUPANCY', obligationId: ids.occCash };
      await request(srv()).post('/api/payments/staff/presential').set(H.empB()).send(body).expect(403);
      await request(srv()).post('/api/payments/staff/presential').set(H.ownerB()).send(body).expect(403);
      await request(srv()).post('/api/payments/staff/presential').set(H.admin()).send(body).expect(403);
      await request(srv()).post('/api/payments/staff/presential').set(H.c1()).send(body).expect(403);
      const r = await request(srv()).post('/api/payments/staff/presential').set(H.empA()).send(body).expect(201);
      expect(r.body).toMatchObject({ method: 'PRESENTIAL', status: 'APPROVED', amountCents: 100000 });
    });

    it('evita que el cliente vuelva a pagarlo y no aparece como pendiente', async () => {
      const r = await pay(H.c1, 'OCCUPANCY', ids.occCash).expect(409);
      expect(r.body.code).toBe('ALREADY_PAID');
      const payable = await request(srv()).get('/api/payments/me/payable').set(H.c1()).expect(200);
      expect(payable.body.some((i: any) => i.obligationId === ids.occCash)).toBe(false);
      await request(srv())
        .post('/api/payments/staff/presential')
        .set(H.ownerA())
        .send({ obligationType: 'OCCUPANCY', obligationId: ids.occCash })
        .expect(409);
    });

    it('vehículo sin cliente registrado: solo puede pagarse en forma presencial', async () => {
      ids.occAnon = (await stay(sp.A4, 'ZZZ999')).id;
      await pay(H.c1, 'OCCUPANCY', ids.occAnon).expect(403);
      const r = await request(srv())
        .post('/api/payments/staff/presential')
        .set(H.ownerA())
        .send({ obligationType: 'OCCUPANCY', obligationId: ids.occAnon })
        .expect(201);
      const [row] = await q(`SELECT payer_user_id, registered_by_user_id FROM payments WHERE id = $1`, [r.body.id]);
      expect(row).toEqual({ payer_user_id: null, registered_by_user_id: u.ownerA });
    });
  });

  // ===================================================================== Mercado Pago
  describe('Mercado Pago Sandbox', () => {
    it('la configuración no expone credenciales', async () => {
      const r = await request(srv()).get('/api/payments/config').set(H.c1()).expect(200);
      expect(r.body).toEqual({ mercadoPagoEnabled: true, sandbox: true, currency: 'ARS' });
      expect(JSON.stringify(r.body)).not.toContain(TOKEN);
    });

    it('crea la operación con el importe del backend y devuelve la URL de Sandbox; un segundo clic la reutiliza', async () => {
      ids.occMP1 = (await stay(sp.A5, 'AAA111')).id;
      const r = await startMp(H.c1, 'OCCUPANCY', ids.occMP1).expect(201);
      expect(r.body.redirectUrl).toContain('sandbox.mercadopago.com.ar');
      expect(JSON.stringify(r.body)).not.toContain(TOKEN);
      ids.mp1 = r.body.paymentId;
      expect(mp.prefs[0]).toMatchObject({ paymentId: ids.mp1, unitPrice: 1000, notificationUrl: process.env.MP_NOTIFICATION_URL });
      expect(mp.prefs[0].backUrl).toContain(`/client/payments/result?paymentId=${ids.mp1}`);
      const [row] = await q(`SELECT status, amount_cents, external_preference_id FROM payments WHERE id = $1`, [ids.mp1]);
      expect(row).toEqual({ status: 'PENDING', amount_cents: '100000', external_preference_id: 'pref-1' });

      const again = await startMp(H.c1, 'OCCUPANCY', ids.occMP1).expect(201);
      expect(again.body).toMatchObject({ paymentId: ids.mp1, reused: true });
      expect(mp.createPreference).toHaveBeenCalledTimes(1);
    });

    it('con un checkout vigente no se puede pagar la misma operación con saldo', async () => {
      const r = await pay(H.c1, 'OCCUPANCY', ids.occMP1).expect(409);
      expect(r.body.code).toBe('PAYMENT_IN_PROGRESS');
    });

    it('volver a EstacionApp no confirma el pago', async () => {
      const s = await request(srv()).post(`/api/payments/${ids.mp1}/sync`).set(H.c1()).expect(200);
      expect(s.body.status).toBe('PENDING');
      await request(srv()).post(`/api/payments/${ids.mp1}/sync`).set(H.c2()).expect(404);
    });

    it('rechaza webhooks sin firma, con firma inválida o con otra clave', async () => {
      mp.add('1001', ids.mp1, 'approved', 1000);
      await webhook('1001', { noSig: true }).expect(401);
      await webhook('1001', { badSig: true }).expect(401);
      await webhook('1001', { secret: 'otra-clave' }).expect(401);
      const [row] = await q(`SELECT status FROM payments WHERE id = $1`, [ids.mp1]);
      expect(row.status).toBe('PENDING');
      expect(mp.getPayment).not.toHaveBeenCalled();
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM payment_events WHERE event = 'INVALID_SIGNATURE'`);
      expect(n).toBe(3);
    });

    it('webhook firmado: consulta el pago a Mercado Pago y lo aprueba', async () => {
      await webhook('1001').expect(200);
      expect(mp.getPayment).toHaveBeenCalledWith('1001');
      const [row] = await q(`SELECT status, external_payment_id, approved_at FROM payments WHERE id = $1`, [ids.mp1]);
      expect(row.status).toBe('APPROVED');
      expect(row.external_payment_id).toBe('1001');
      expect(row.approved_at).not.toBeNull();
      await new Promise((r) => setTimeout(r, 300));
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM user_notifications WHERE user_id = $1 AND type = 'payment_approved'`, [u.client1]);
      expect(n).toBeGreaterThanOrEqual(1);
    });

    it('webhooks repetidos no duplican el pago', async () => {
      for (let i = 0; i < 3; i++) await webhook('1001').expect(200);
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM payments WHERE occupancy_id = $1 AND status = 'APPROVED'`, [ids.occMP1]);
      expect(n).toBe(1);
      const [{ e }] = await q(`SELECT count(*)::int AS e FROM payment_events WHERE payment_id = $1 AND event = 'REPEATED_NOTIFICATION'`, [ids.mp1]);
      expect(e).toBe(3);
    });

    it('pago rechazado y luego aprobado en un reintento del mismo checkout', async () => {
      ids.occMP2 = (await stay(sp.A5, 'AAA111')).id;
      ids.mp2 = (await startMp(H.c1, 'OCCUPANCY', ids.occMP2).expect(201)).body.paymentId;
      mp.add('2002', ids.mp2, 'rejected', 1000);
      await webhook('2002').expect(200);
      let [row] = await q(`SELECT status FROM payments WHERE id = $1`, [ids.mp2]);
      expect(row.status).toBe('REJECTED');
      mp.add('2003', ids.mp2, 'approved', 1000);
      await webhook('2003').expect(200);
      [row] = await q(`SELECT status, external_payment_id FROM payments WHERE id = $1`, [ids.mp2]);
      expect(row).toEqual({ status: 'APPROVED', external_payment_id: '2003' });
    });

    it('pago pendiente en Mercado Pago: queda PENDIENTE y no se puede cancelar', async () => {
      ids.occMP3 = (await stay(sp.A5, 'AAA111')).id;
      ids.mp3 = (await startMp(H.c1, 'OCCUPANCY', ids.occMP3).expect(201)).body.paymentId;
      mp.add('3003', ids.mp3, 'in_process', 1000);
      await webhook('3003').expect(200);
      const [row] = await q(`SELECT status, external_payment_id FROM payments WHERE id = $1`, [ids.mp3]);
      expect(row).toEqual({ status: 'PENDING', external_payment_id: '3003' });
      await request(srv()).post(`/api/payments/${ids.mp3}/cancel`).set(H.c1()).expect(409);
    });

    it('solo dinero ficticio: un pago real (live_mode) nunca se aplica', async () => {
      ids.occMPLive = (await stay(sp.A5, 'AAA111')).id;
      ids.mpLive = (await startMp(H.c1, 'OCCUPANCY', ids.occMPLive).expect(201)).body.paymentId;
      mp.add('9009', ids.mpLive, 'approved', 1000, { live_mode: true });
      await webhook('9009').expect(200);
      const [row] = await q(`SELECT status, external_payment_id FROM payments WHERE id = $1`, [ids.mpLive]);
      expect(row).toEqual({ status: 'PENDING', external_payment_id: null });
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM payment_events WHERE payment_id = $1 AND event = 'LIVE_MODE_REJECTED'`, [ids.mpLive]);
      expect(n).toBe(1);
      // se libera la operación para no dejarla bloqueada
      await request(srv()).post(`/api/payments/${ids.mpLive}/cancel`).set(H.c1()).expect(200);
    });

    it('un importe distinto al facturado no se aprueba; el sync aplica el pago correcto', async () => {
      ids.occMP4 = (await stay(sp.A5, 'AAA111')).id;
      ids.mp4 = (await startMp(H.c1, 'OCCUPANCY', ids.occMP4).expect(201)).body.paymentId;
      mp.add('4004', ids.mp4, 'approved', 1.01);
      await webhook('4004').expect(200);
      let [row] = await q(`SELECT status FROM payments WHERE id = $1`, [ids.mp4]);
      expect(row.status).toBe('PENDING');
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM payment_events WHERE payment_id = $1 AND event = 'AMOUNT_MISMATCH'`, [ids.mp4]);
      expect(n).toBe(1);
      mp.add('4005', ids.mp4, 'approved', 1000);
      const s = await request(srv()).post(`/api/payments/${ids.mp4}/sync`).set(H.c1()).expect(200);
      expect(s.body.status).toBe('APPROVED');
      [row] = await q(`SELECT external_payment_id FROM payments WHERE id = $1`, [ids.mp4]);
      expect(row.external_payment_id).toBe('4005');
    });

    it('aprobación tardía de un intento cancelado: se registra la incidencia sin un segundo cobro', async () => {
      ids.occMP5 = (await stay(sp.A5, 'AAA111')).id;
      ids.mp5 = (await startMp(H.c1, 'OCCUPANCY', ids.occMP5).expect(201)).body.paymentId;
      const c = await request(srv()).post(`/api/payments/${ids.mp5}/cancel`).set(H.c1()).expect(200);
      expect(c.body.status).toBe('CANCELLED');
      await pay(H.c1, 'OCCUPANCY', ids.occMP5).expect(201);
      mp.add('5005', ids.mp5, 'approved', 1000);
      await webhook('5005').expect(200);
      const rows = await q(`SELECT method, status, status_detail FROM payments WHERE occupancy_id = $1 ORDER BY created_at`, [ids.occMP5]);
      expect(rows).toEqual([
        { method: 'MERCADO_PAGO', status: 'CANCELLED', status_detail: 'approved_duplicate' },
        { method: 'WALLET', status: 'APPROVED', status_detail: null },
      ]);
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM payment_events WHERE payment_id = $1 AND event = 'DUPLICATE_EXTERNAL'`, [ids.mp5]);
      expect(n).toBe(1);
    });

    it('los checkouts vencidos se cancelan y liberan la operación', async () => {
      ids.occMP6 = (await stay(sp.A6, 'AAA111')).id;
      ids.mp6 = (await startMp(H.c1, 'OCCUPANCY', ids.occMP6).expect(201)).body.paymentId;
      await q(`UPDATE payments SET expires_at = now() - interval '10 minutes' WHERE id = $1`, [ids.mp6]);
      await app.get(MercadoPagoService).expireStalePending();
      const [row] = await q(`SELECT status, status_detail FROM payments WHERE id = $1`, [ids.mp6]);
      expect(row).toEqual({ status: 'CANCELLED', status_detail: 'expired' });
      await pay(H.c1, 'OCCUPANCY', ids.occMP6).expect(201);
    });

    it('notificaciones de webhooks de otros tópicos se ignoran sin error', async () => {
      const ts = String(Date.now());
      const v1 = createHmac('sha256', 'whsec_test').update(`id:abc123;ts:${ts};`).digest('hex');
      await request(srv())
        .post('/api/payments/mercadopago/webhook?data.id=abc123&type=merchant_order')
        .set('x-signature', `ts=${ts},v1=${v1}`)
        .send({ type: 'merchant_order', data: { id: 'abc123' } })
        .expect(200);
    });
  });

  // ===================================================================== historial
  describe('historial de pagos del cliente', () => {
    it('lista solo pagos de estacionamiento propios (sin cargas)', async () => {
      const r = await request(srv()).get('/api/payments/me?limit=100').set(H.c1()).expect(200);
      expect(r.body.items.length).toBeGreaterThan(5);
      r.body.items.forEach((p: any) => {
        expect(['RESERVATION', 'OCCUPANCY']).toContain(p.obligationType);
        expect(p.parkingLotName).toBe('Lote A');
      });
      const ids2 = (await request(srv()).get('/api/payments/me?limit=100').set(H.c2()).expect(200)).body.items.map((p: any) => p.id);
      expect(ids2).not.toContain(ids.mp1);
      await request(srv()).get(`/api/payments/me/${ids.mp1}`).set(H.c2()).expect(404);
    });
  });

  // ===================================================================== finanzas
  describe('finanzas del dueño', () => {
    it('resumen: solo pagos aprobados de sus estacionamientos, sin duplicados', async () => {
      const [{ total }] = await q(`SELECT COALESCE(SUM(amount_cents),0)::bigint AS total FROM payments WHERE parking_lot_id = $1 AND status = 'APPROVED'`, [lot.A]);
      const r = await request(srv()).get('/api/finance/summary').set(H.ownerA()).expect(200);
      expect(r.body.incomeTotalCents).toBe(Number(total));
      expect(r.body.incomeTodayCents).toBe(Number(total));
      expect(r.body.incomeWeekCents).toBe(Number(total));
      expect(r.body.incomeLast30DaysCents).toBe(Number(total));
      expect(r.body.counts.pending).toBe(1); // mp3 (in_process)
      expect(r.body.counts.rejected).toBe(0);
      expect(r.body.byMethodCents.presential).toBe(200000);
      expect(r.body.byMethodCents.mercadoPago).toBe(300000);
      const b = await request(srv()).get('/api/finance/summary').set(H.ownerB()).expect(200);
      expect(b.body.incomeTotalCents).toBe(10000);
    });

    it('series por día, semana y mes', async () => {
      for (const [g, n] of [
        ['day', 30],
        ['week', 12],
        ['month', 12],
      ] as const) {
        const r = await request(srv()).get('/api/finance/series').query({ granularity: g }).set(H.ownerA()).expect(200);
        expect(r.body.points).toHaveLength(n);
        const sum = r.body.points.reduce((a: number, p: any) => a + p.amountCents, 0);
        const s = await request(srv()).get('/api/finance/summary').set(H.ownerA()).expect(200);
        expect(sum).toBe(s.body.incomeTotalCents);
      }
      await request(srv()).get('/api/finance/series').query({ granularity: 'year' }).set(H.ownerA()).expect(400);
    });

    it('historial de pagos recibidos con patente, cliente, medio y estado; filtro por estado', async () => {
      const r = await request(srv()).get('/api/finance/payments').query({ parkingLotId: lot.A, limit: 100 }).set(H.ownerA()).expect(200);
      const mp1 = r.body.items.find((i: any) => i.id === ids.mp1);
      expect(mp1).toMatchObject({ vehiclePlate: 'AAA111', clientName: 'C1', method: 'MERCADO_PAGO', status: 'APPROVED', parkingLotName: 'Lote A' });
      const cancelled = await request(srv()).get('/api/finance/payments').query({ status: 'CANCELLED' }).set(H.ownerA()).expect(200);
      expect(cancelled.body.items.every((i: any) => i.status === 'CANCELLED')).toBe(true);
      expect(cancelled.body.total).toBeGreaterThanOrEqual(2);
    });

    it('cada dueño consulta solo sus estacionamientos; empleados, clientes y admin no acceden', async () => {
      await request(srv()).get('/api/finance/summary').query({ parkingLotId: lot.B }).set(H.ownerA()).expect(403);
      await request(srv()).get('/api/finance/payments').query({ parkingLotId: lot.A }).set(H.ownerB()).expect(403);
      for (const h of [H.empA, H.c1, H.admin]) {
        await request(srv()).get('/api/finance/summary').set(h()).expect(403);
      }
    });
  });

  // ===================================================================== empleados y actividad
  describe('empleado y tarjetas de actividad', () => {
    it('el empleado consulta estado, medio e importe, sin datos de billeteras', async () => {
      const r = await request(srv())
        .get(`/api/payments/staff/parking-lot/${lot.A}/status`)
        .query({ occupancyId: ids.occMP3 })
        .set(H.empA())
        .expect(200);
      expect(r.body).toMatchObject({ status: 'PENDING', method: 'MERCADO_PAGO', amountCents: 100000 });
      expect(JSON.stringify(r.body)).not.toMatch(/balance/i);
      await request(srv()).get(`/api/payments/staff/parking-lot/${lot.A}/status`).query({ occupancyId: ids.occMP3 }).set(H.empB()).expect(403);
      // Una estadía de otro estacionamiento no se puede consultar por este lote
      await request(srv()).get(`/api/payments/staff/parking-lot/${lot.B}/status`).query({ occupancyId: ids.occMP3 }).set(H.ownerB()).expect(404);
    });

    it('las tarjetas de egresos y reservas muestran el pago real (dueño y empleado)', async () => {
      for (const h of [H.ownerA, H.empA]) {
        const r = await request(srv()).get(`/api/activity/parking-lot/${lot.A}`).query({ limit: 50 }).set(h()).expect(200);
        const byId = (id: string) => r.body.items.find((i: any) => i.sourceId === id && i.type === 'check_out');
        expect(byId(ids.occMP1).payment).toMatchObject({ status: 'APPROVED', method: 'MERCADO_PAGO', amountCents: 100000 });
        expect(byId(ids.occCash).payment).toMatchObject({ status: 'APPROVED', method: 'PRESENTIAL' });
        expect(byId(ids.occMP3).payment).toMatchObject({ status: 'PENDING', method: 'MERCADO_PAGO' });
        expect(byId(ids.occCovered).payment).toMatchObject({ status: 'COVERED' });
        const reservation = r.body.items.find((i: any) => i.sourceId === res.confirmed && i.type === 'reservation');
        expect(reservation.payment).toMatchObject({ status: 'APPROVED', method: 'WALLET' });
      }
    });

    it('la vista del administrador no cambia', async () => {
      const r = await request(srv()).get(`/api/activity/parking-lot/${lot.A}`).query({ limit: 50 }).set(H.admin()).expect(200);
      expect(r.body.items.some((i: any) => 'payment' in i)).toBe(false);
    });
  });

  // ===================================================================== D6
  describe('GET /reservations/:id valida pertenencia (D6)', () => {
    it('cliente: solo sus reservas; dueño: solo sus estacionamientos; admin: sin cambios', async () => {
      await request(srv()).get(`/api/reservations/${res.confirmed}`).set(H.c1()).expect(200);
      await request(srv()).get(`/api/reservations/${res.confirmed}`).set(H.c2()).expect(404);
      await request(srv()).get(`/api/reservations/${res.confirmed}`).set(H.ownerA()).expect(200);
      await request(srv()).get(`/api/reservations/${res.confirmed}`).set(H.ownerB()).expect(404);
      await request(srv()).get(`/api/reservations/${res.confirmed}`).set(H.admin()).expect(200);
      await request(srv()).get(`/api/reservations/${randomUUID()}`).set(H.admin()).expect(404);
    });
  });

  // ===================================================================== consistencia
  describe('consistencia en la base', () => {
    it('cada saldo coincide con sus movimientos y nunca es negativo', async () => {
      const mismatches = await q(
        `SELECT w.id FROM wallets w LEFT JOIN wallet_transactions t ON t.wallet_id = w.id
          GROUP BY w.id
         HAVING w.balance_cents <> COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount_cents ELSE -t.amount_cents END), 0)`,
      );
      expect(mismatches).toEqual([]);
      const [{ n }] = await q(`SELECT count(*)::int AS n FROM wallets WHERE balance_cents < 0`);
      expect(n).toBe(0);
    });

    it('ninguna operación tiene dos pagos aprobados', async () => {
      const dup = await q(`SELECT obligation_key FROM payments WHERE status = 'APPROVED' GROUP BY 1 HAVING count(*) > 1`);
      expect(dup).toEqual([]);
    });

    it('la base rechaza un segundo pago activo aunque se saltee la API', async () => {
      await expect(
        q(
          `INSERT INTO payments (payer_user_id, parking_lot_id, obligation_type, reservation_id, obligation_key, concept,
                                 billed_amount_cents, amount_cents, method, status)
           VALUES ($1,$2,'RESERVATION',$3,$4,'x',300000,300000,'WALLET','APPROVED')`,
          [u.client1, lot.A, res.confirmed, `reservation:${res.confirmed}`],
        ),
      ).rejects.toThrow(/UQ_payments_active_obligation/);
    });
  });
});
