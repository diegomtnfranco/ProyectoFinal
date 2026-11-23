/* E2E HTTP con guards reales (JwtAuthGuard + JwtStrategy + RolesGuard) y el ValidationPipe de main.ts */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import * as glob from 'glob';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { ParkingProfilesModule } from '../../src/modules/parking-profiles/parking-profiles.module';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { User } from '../../src/modules/users/entities/user.entity';

jest.setTimeout(60000);
const SECRET = 'test-secret';

describe('HTTP /api/parking-profiles', () => {
  let app: INestApplication;
  let ds: DataSource;
  const ids = { ownerA: randomUUID(), ownerB: randomUUID(), employee: randomUUID(), client: randomUUID(), lotA: randomUUID(), lotB: randomUUID() };
  const token = (sub: string, role: string) => jwt.sign({ sub, email: `${sub}@x.com`, role }, SECRET);
  const auth = (sub: string, role: string) => ({ Authorization: `Bearer ${token(sub, role)}` });

  beforeAll(async () => {
    const entities = glob.sync(__dirname + '/../../src/modules/**/*.entity.ts').flatMap((f) => Object.values(require(f))).filter((v: any) => typeof v === 'function');
    const mod = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ ignoreEnvFile: true, load: [() => ({ JWT_SECRET: SECRET })] }),
        TypeOrmModule.forRoot({ type: 'postgres', host: 'localhost', port: 54329, username: 'postgres', password: 'pw', database: 'estacionapp_it', entities: entities as any, synchronize: true }),
        TypeOrmModule.forFeature([User]),
        PassportModule,
        ParkingProfilesModule,
      ],
      providers: [JwtStrategy, { provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: RolesGuard }],
    }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    ds = app.get(DataSource);

    const q = (sql: string, p: any[]) => ds.query(sql, p);
    await q(`TRUNCATE parking_lot_custom_services, parking_lot_catalog_selections, parking_lot_profiles CASCADE`, []);
    for (const [id, role] of [[ids.ownerA, 'parking_owner'], [ids.ownerB, 'parking_owner'], [ids.employee, 'parking_employee'], [ids.client, 'client']]) {
      await q(`INSERT INTO users (id, email, role) VALUES ($1,$2,$3)`, [id, `${id}@x.com`, role]);
    }
    const poA = randomUUID();
    const poB = randomUUID();
    await q(`INSERT INTO parking_owners (id, user_id, name, business_name) VALUES ($1,$2,'A','A'),($3,$4,'B','B')`, [poA, ids.ownerA, poB, ids.ownerB]);
    await q(`INSERT INTO parking_lots (id, owner_id, name, address, latitude, longitude, open_time, close_time) VALUES ($1,$2,'A','Dir A',0,0,'08:00','20:00'),($3,$4,'B','Dir B',0,0,'08:00','20:00')`, [ids.lotA, poA, ids.lotB, poB]);
    await q(`INSERT INTO parking_employees (id, user_id, parking_lot_id, name) VALUES ($1,$2,$3,'E')`, [randomUUID(), ids.employee, ids.lotA]);
  });

  afterAll(async () => app?.close());

  const base = (lot: string) => `/api/parking-profiles/${lot}`;

  it('lectura pública sin token', async () => {
    const res = await request(app.getHttpServer()).get(`${base(ids.lotA)}/public`).expect(200);
    expect(res.body).toMatchObject({ address: 'Dir A', hasDetails: false });
    expect(JSON.stringify(res.body)).not.toContain(ids.ownerA);
  });

  it('configuración administrativa exige token', async () => {
    await request(app.getHttpServer()).get(base(ids.lotA)).expect(401);
    await request(app.getHttpServer()).put(base(ids.lotA)).send({ description: 'x' }).expect(401);
  });

  it('empleado y cliente no pueden editar (403)', async () => {
    await request(app.getHttpServer()).put(base(ids.lotA)).set(auth(ids.employee, 'parking_employee')).send({ description: 'x' }).expect(403);
    await request(app.getHttpServer()).post(`${base(ids.lotA)}/custom-services`).set(auth(ids.client, 'client')).send({ title: 'x', pricing: { type: 'free' } }).expect(403);
    await request(app.getHttpServer()).get(base(ids.lotA)).set(auth(ids.employee, 'parking_employee')).expect(403);
  });

  it('un dueño no puede leer ni editar otro estacionamiento (403)', async () => {
    await request(app.getHttpServer()).get(base(ids.lotB)).set(auth(ids.ownerA, 'parking_owner')).expect(403);
    await request(app.getHttpServer()).put(base(ids.lotB)).set(auth(ids.ownerA, 'parking_owner')).send({ description: 'x' }).expect(403);
  });

  it('valida precios y combinaciones en el servidor (400)', async () => {
    const h = auth(ids.ownerA, 'parking_owner');
    const srv = app.getHttpServer();
    await request(srv).post(`${base(ids.lotA)}/custom-services`).set(h).send({ title: 'X', pricing: { type: 'extra_cost', amount: -1, unit: 'fixed' } }).expect(400);
    await request(srv).post(`${base(ids.lotA)}/custom-services`).set(h).send({ title: 'X', pricing: { type: 'included', amount: 10 } }).expect(400);
    await request(srv).post(`${base(ids.lotA)}/custom-services`).set(h).send({ title: 'X', pricing: { type: 'extra_cost', amount: 10 } }).expect(400);
    await request(srv).post(`${base(ids.lotA)}/custom-services`).set(h).send({ title: '', pricing: { type: 'free' } }).expect(400);
    await request(srv).put(base(ids.lotA)).set(h).send({ services: [{ code: 'car_wash', enabled: true }] }).expect(400);
    await request(srv).put(base(ids.lotA)).set(h).send({ hacked: true }).expect(400);
    await request(srv).put(base('no-uuid')).set(h).send({}).expect(400);
  });

  it('flujo completo del dueño y vista pública', async () => {
    const h = auth(ids.ownerA, 'parking_owner');
    const srv = app.getHttpServer();
    const put = await request(srv).put(base(ids.lotA)).set(h).send({
      description: 'Cerca de la plaza',
      physicalFeatures: [{ code: 'covered', enabled: true }, { code: 'open_air', enabled: true }],
      services: [{ code: 'helmet_storage', enabled: true, pricing: { type: 'free' } }],
    }).expect(200);
    expect(put.body.physicalFeatures.filter((f: any) => f.enabled)).toHaveLength(2);

    const created = await request(srv).post(`${base(ids.lotA)}/custom-services`).set(h)
      .send({ title: 'Lavado premium', conditions: 'Con turno', pricing: { type: 'extra_cost', amount: 8000, unit: 'per_vehicle' } }).expect(201);
    await request(srv).patch(`${base(ids.lotA)}/custom-services/${created.body.id}`).set(h).send({ isActive: true, description: 'Interior y exterior' }).expect(200);
    // otro dueño no puede tocarlo aunque conozca el id
    await request(srv).delete(`${base(ids.lotB)}/custom-services/${created.body.id}`).set(auth(ids.ownerB, 'parking_owner')).expect(404);

    const pub = await request(srv).get(`${base(ids.lotA)}/public`).expect(200);
    expect(pub.body.services.map((s: any) => [s.name, s.pricing.type, s.pricing.amount])).toEqual([
      ['Custodia de cascos', 'free', null],
      ['Lavado premium', 'extra_cost', 8000],
    ]);
    expect(pub.body.physicalFeatures.map((f: any) => f.name)).toEqual(['Techado', 'Al aire libre']);

    await request(srv).delete(`${base(ids.lotA)}/custom-services/${created.body.id}`).set(h).expect(204);
    await request(srv).delete(`${base(ids.lotA)}/custom-services/${created.body.id}`).set(h).expect(404);
  });
});
