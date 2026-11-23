/* Prueba de integración con PostgreSQL real (embedded-postgres), mismo synchronize que el proyecto */
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import * as glob from 'glob';
import { ParkingProfilesService } from '../../src/modules/parking-profiles/parking-profiles.service';
import { ParkingLot } from '../../src/modules/parking-lots/entities/parking-lot.entity';
import { ParkingCatalogOption } from '../../src/modules/parking-profiles/entities/parking-catalog-option.entity';
import { ParkingLotProfile } from '../../src/modules/parking-profiles/entities/parking-lot-profile.entity';
import { ParkingLotCatalogSelection } from '../../src/modules/parking-profiles/entities/parking-lot-catalog-selection.entity';
import { ParkingLotCustomService } from '../../src/modules/parking-profiles/entities/parking-lot-custom-service.entity';
import { PriceUnit, PricingType } from '../../src/modules/parking-profiles/parking-profiles.constants';

jest.setTimeout(120000);
// El servidor lo levanta itest/pg-server.mjs (embedded-postgres es ESM)

describe('parking-profiles con PostgreSQL real', () => {
  let ds: DataSource;
  let service: ParkingProfilesService;
  const lotId = randomUUID();
  const otherLot = randomUUID();
  const lotB = randomUUID();
  const userId = randomUUID();
  const userB = randomUUID();
  const owner = { id: userId, role: 'parking_owner' };

  const makeDs = () => {
    const entities = glob
      .sync(__dirname + '/../../src/modules/**/*.entity.ts')
      .flatMap((f) => Object.values(require(f)))
      .filter((v: any) => typeof v === 'function');
    return new DataSource({
      type: 'postgres', host: 'localhost', port: 54329, username: 'postgres', password: 'pw',
      database: 'estacionapp_it', entities, synchronize: true,
    });
  };
  const newService = (d: DataSource) =>
    new ParkingProfilesService(
      d.getRepository(ParkingLot), d.getRepository(ParkingCatalogOption), d.getRepository(ParkingLotProfile),
      d.getRepository(ParkingLotCatalogSelection), d.getRepository(ParkingLotCustomService), d,
    );

  beforeAll(async () => {
    ds = await makeDs().initialize();
    const q = (sql: string, p: any[]) => ds.query(sql, p);
    for (const [uid, email] of [[userId, 'a@x.com'], [userB, 'b@x.com']]) {
      await q(`INSERT INTO users (id, email, role) VALUES ($1,$2,'parking_owner')`, [uid, email]);
    }
    const ownerA = randomUUID();
    const ownerB = randomUUID();
    await q(`INSERT INTO parking_owners (id, user_id, name, business_name) VALUES ($1,$2,'A','A SA'),($3,$4,'B','B SA')`, [ownerA, userId, ownerB, userB]);
    for (const [id, own, addr] of [[lotId, ownerA, 'Av. Siempre Viva 742'], [otherLot, ownerA, 'Calle Falsa 123'], [lotB, ownerB, 'Otra 1']]) {
      await q(
        `INSERT INTO parking_lots (id, owner_id, name, address, latitude, longitude, open_time, close_time) VALUES ($1,$2,'P',$3,0,0,'08:00','20:00')`,
        [id, own, addr],
      );
    }
    service = newService(ds);
    await service.onModuleInit();
    await service.onModuleInit(); // idempotente
  });

  afterAll(async () => {
    await ds?.destroy();
  });

  it('el catálogo se carga una sola vez con códigos estables', async () => {
    const rows = await ds.getRepository(ParkingCatalogOption).find();
    expect(rows.map((r) => r.code).sort()).toEqual(['car_wash', 'covered', 'helmet_storage', 'open_air', 'shade_net']);
  });

  it('persiste y relee tras reiniciar la conexión (equivale a recargar la app)', async () => {
    await service.updateProfile(lotId, {
      description: 'Hola',
      physicalFeatures: [{ code: 'covered', enabled: true, notes: 'PB' }, { code: 'shade_net', enabled: true }],
      services: [{ code: 'car_wash', enabled: true, conditions: 'Coordinar', pricing: { type: PricingType.EXTRA_COST, amount: 1234.56, unit: PriceUnit.PER_VEHICLE } }],
    }, owner);
    await service.updateProfile(lotId, { physicalFeatures: [{ code: 'covered', enabled: false }] }, owner);
    await service.createCustomService(lotId, { title: 'Wifi', pricing: { type: PricingType.INCLUDED } }, owner);

    await ds.destroy();
    ds = await makeDs().initialize();
    service = newService(ds);

    const view = await service.getAdminProfile(lotId, owner);
    expect(view.description).toBe('Hola');
    expect(view.address).toBe('Av. Siempre Viva 742');
    expect(view.physicalFeatures.filter((f) => f.enabled).map((f) => f.code)).toEqual(['shade_net']);
    expect(view.services.find((s) => s.code === 'car_wash')!.pricing).toEqual({ type: 'extra_cost', amount: 1234.56, unit: 'per_vehicle', currency: 'ARS' });
    expect(view.customServices.map((s) => s.title)).toEqual(['Wifi']);

    const other = await service.getAdminProfile(otherLot, owner);
    expect(other.physicalFeatures.some((f) => f.enabled) || other.customServices.length > 0).toBe(false);

    const pub = await service.getPublicProfile(lotId);
    expect(pub.services.map((s) => s.name)).toEqual(['Limpieza de vehículos', 'Wifi']);
    expect(pub.physicalFeatures).toEqual([{ code: 'shade_net', name: 'Media sombra', notes: null }]);
  });

  it('título duplicado (sin distinguir mayúsculas) y dueño ajeno son rechazados', async () => {
    await expect(service.createCustomService(lotId, { title: 'WIFI', pricing: { type: PricingType.FREE } }, owner)).rejects.toThrow('Ya existe');
    await expect(service.updateProfile(lotB, { description: 'x' }, owner)).rejects.toThrow('permiso');
  });

  it('eliminar un servicio personalizado no toca el catálogo ni otros lotes', async () => {
    const other = await service.createCustomService(otherLot, { title: 'Wifi', pricing: { type: PricingType.FREE } }, owner);
    const mine = (await service.getAdminProfile(lotId, owner)).customServices[0];
    await service.deleteCustomService(lotId, mine.id, owner);
    expect(await ds.getRepository(ParkingLotCustomService).find()).toEqual([expect.objectContaining({ id: other.id })]);
    expect(await ds.getRepository(ParkingCatalogOption).count()).toBe(5);
  });

  it('la base rechaza dos selecciones para la misma opción y lote (constraint único)', async () => {
    const opt = await ds.getRepository(ParkingCatalogOption).findOneByOrFail({ code: 'open_air' });
    const repo = ds.getRepository(ParkingLotCatalogSelection);
    await repo.insert({ parkingLotId: lotB, optionId: opt.id, isEnabled: true });
    await expect(repo.insert({ parkingLotId: lotB, optionId: opt.id, isEnabled: false })).rejects.toThrow();
  });
});
