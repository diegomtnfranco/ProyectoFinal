import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FindOperator } from 'typeorm';
import { ParkingProfilesService } from './parking-profiles.service';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { ParkingCatalogOption } from './entities/parking-catalog-option.entity';
import { ParkingLotProfile } from './entities/parking-lot-profile.entity';
import { ParkingLotCatalogSelection } from './entities/parking-lot-catalog-selection.entity';
import { ParkingLotCustomService } from './entities/parking-lot-custom-service.entity';
import {
  CATALOG_SEED,
  PriceUnit,
  PricingType,
} from './parking-profiles.constants';
import { UserRole } from '../users/entities/user.entity';

/** Repositorio en memoria: suficiente para probar reglas de negocio y aislamiento */
class MemoryRepo<T extends Record<string, any>> {
  rows: T[] = [];
  private seq = 0;
  constructor(private readonly key: string = 'id') {}

  private matches(row: T, where: Record<string, any> = {}): boolean {
    return Object.entries(where).every(([k, v]) => {
      if (v instanceof FindOperator) {
        if ((v as any).type === 'in') return (v as any).value.includes(row[k]);
        throw new Error('operador no soportado');
      }
      return row[k] === v;
    });
  }
  async findOne(opts: { where: any }) {
    const r = this.rows.find((row) => this.matches(row, opts.where));
    return r ? structuredClone(r) : null;
  }
  async find(opts: { where?: any } = {}) {
    return this.rows
      .filter((row) => this.matches(row, opts.where))
      .map((r) => structuredClone(r));
  }
  async count(opts: { where?: any } = {}) {
    return (await this.find(opts)).length;
  }
  create(data: Partial<T>) {
    return { ...data } as T;
  }
  async save(entity: any): Promise<any> {
    if (Array.isArray(entity))
      return Promise.all(entity.map((e) => this.save(e)));
    const now = new Date(Date.now() + this.seq);
    if (entity[this.key] === undefined) entity[this.key] = `gen-${++this.seq}`;
    const idx = this.rows.findIndex((r) => r[this.key] === entity[this.key]);
    const stored = {
      createdAt: now,
      ...(idx >= 0 ? this.rows[idx] : {}),
      ...entity,
      updatedAt: now,
    };
    if (idx >= 0) this.rows[idx] = stored;
    else this.rows.push(stored);
    return structuredClone(stored);
  }
  async delete(where: any) {
    this.rows = this.rows.filter((r) => !this.matches(r, where));
  }
  /** Solo para la verificación de títulos únicos */
  createQueryBuilder() {
    const params: Record<string, any> = {};
    const qb: any = {
      where: (_: string, p: any) => (Object.assign(params, p), qb),
      andWhere: (_: string, p: any) => (Object.assign(params, p), qb),
      getCount: async () =>
        this.rows.filter(
          (r) =>
            r.parkingLotId === params.parkingLotId &&
            r.title.toLowerCase() === String(params.title).toLowerCase() &&
            r.id !== params.excludeId,
        ).length,
    };
    return qb;
  }
}

const OWNER_A = { id: 'user-a', role: UserRole.PARKING_OWNER };
const OWNER_B = { id: 'user-b', role: UserRole.PARKING_OWNER };
const LOT_A1 = 'lot-a1';
const LOT_A2 = 'lot-a2';
const LOT_B = 'lot-b';

describe('ParkingProfilesService', () => {
  let service: ParkingProfilesService;
  let lots: MemoryRepo<any>;
  let catalog: MemoryRepo<any>;
  let profiles: MemoryRepo<any>;
  let selections: MemoryRepo<any>;
  let customs: MemoryRepo<any>;

  beforeEach(() => {
    lots = new MemoryRepo();
    lots.rows = [
      {
        id: LOT_A1,
        name: 'A1',
        address: 'Calle 1 123',
        isActive: true,
        owner: { userId: OWNER_A.id },
      },
      {
        id: LOT_A2,
        name: 'A2',
        address: 'Calle 2 456',
        isActive: true,
        owner: { userId: OWNER_A.id },
      },
      {
        id: LOT_B,
        name: 'B',
        address: 'Calle 3 789',
        isActive: true,
        owner: { userId: OWNER_B.id },
      },
    ];
    catalog = new MemoryRepo();
    catalog.rows = CATALOG_SEED.map((c, i) => ({
      ...c,
      id: `opt-${c.code}`,
      isActive: true,
      sortOrder: i,
    }));
    profiles = new MemoryRepo('parkingLotId');
    selections = new MemoryRepo();
    customs = new MemoryRepo();

    const byEntity = new Map<any, any>([
      [ParkingLotProfile, profiles],
      [ParkingLotCatalogSelection, selections],
    ]);
    const dataSource: any = {
      transaction: async (cb: any) =>
        cb({ getRepository: (e: any) => byEntity.get(e) }),
      manager: {},
    };
    service = new ParkingProfilesService(
      lots as any,
      catalog as any,
      profiles as any,
      selections as any,
      customs as any,
      dataSource,
    );
  });

  // 1 y 14
  it('guarda la descripción y devuelve la dirección existente sin duplicarla', async () => {
    const view = await service.updateProfile(
      LOT_A1,
      { description: '  Atención 24 h  ' },
      OWNER_A,
    );
    expect(view.description).toBe('Atención 24 h');
    expect(view.address).toBe('Calle 1 123');
    expect(profiles.rows[0]).not.toHaveProperty('address');
  });

  // 2 y 3
  it('permite combinar características y no afecta a otros estacionamientos', async () => {
    await service.updateProfile(
      LOT_A1,
      {
        physicalFeatures: [
          { code: 'covered', enabled: true, notes: 'Planta baja' },
          { code: 'shade_net', enabled: true },
        ],
      },
      OWNER_A,
    );
    const a1 = await service.getAdminProfile(LOT_A1, OWNER_A);
    const a2 = await service.getAdminProfile(LOT_A2, OWNER_A);
    expect(
      a1.physicalFeatures.filter((f) => f.enabled).map((f) => f.code),
    ).toEqual(['covered', 'shade_net']);
    expect(a1.physicalFeatures.find((f) => f.code === 'covered')!.notes).toBe(
      'Planta baja',
    );
    expect(a2.physicalFeatures.every((f) => !f.enabled)).toBe(true);
  });

  it('no hay activaciones por defecto', async () => {
    const view = await service.getAdminProfile(LOT_A1, OWNER_A);
    expect(
      [...view.physicalFeatures, ...view.services].some((o) => o.enabled),
    ).toBe(false);
    expect(view.customServices).toHaveLength(0);
  });

  // 4 y 6
  it('activa y desactiva servicios predefinidos sin borrar el catálogo', async () => {
    const pricing = {
      type: PricingType.EXTRA_COST,
      amount: 3000,
      unit: PriceUnit.PER_VEHICLE,
    };
    await service.updateProfile(
      LOT_A1,
      { services: [{ code: 'car_wash', enabled: true, pricing }] },
      OWNER_A,
    );
    let view = await service.getAdminProfile(LOT_A1, OWNER_A);
    expect(view.services.find((s) => s.code === 'car_wash')).toMatchObject({
      enabled: true,
      pricing: { amount: 3000 },
    });

    await service.updateProfile(
      LOT_A1,
      { services: [{ code: 'car_wash', enabled: false }] },
      OWNER_A,
    );
    view = await service.getAdminProfile(LOT_A1, OWNER_A);
    const carWash = view.services.find((s) => s.code === 'car_wash')!;
    expect(carWash.enabled).toBe(false);
    expect(carWash.pricing?.amount).toBe(3000); // conserva el precio configurado
    expect(catalog.rows).toHaveLength(CATALOG_SEED.length);
  });

  it('exige modalidad de cobro para activar un servicio y rechaza códigos desconocidos o de otro tipo', async () => {
    await expect(
      service.updateProfile(
        LOT_A1,
        { services: [{ code: 'car_wash', enabled: true }] },
        OWNER_A,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateProfile(
        LOT_A1,
        { services: [{ code: 'nope', enabled: true }] },
        OWNER_A,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateProfile(
        LOT_A1,
        { physicalFeatures: [{ code: 'car_wash', enabled: true }] },
        OWNER_A,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateProfile(
        LOT_A1,
        {
          physicalFeatures: [
            { code: 'covered', enabled: true },
            { code: 'covered', enabled: false },
          ],
        },
        OWNER_A,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // 5, 7 y 8
  it('crea, edita y elimina servicios personalizados', async () => {
    const created = await service.createCustomService(
      LOT_A1,
      {
        title: ' Inflado ',
        description: 'Neumáticos',
        conditions: 'Coordinar con el playero',
        pricing: { type: PricingType.FREE },
      },
      OWNER_A,
    );
    expect(created).toMatchObject({
      title: 'Inflado',
      isActive: true,
      pricing: { type: 'free', amount: null },
    });

    const updated = await service.updateCustomService(
      LOT_A1,
      created.id,
      {
        pricing: {
          type: PricingType.EXTRA_COST,
          amount: 250.5,
          unit: PriceUnit.PER_USE,
        },
      },
      OWNER_A,
    );
    expect(updated.pricing).toEqual({
      type: 'extra_cost',
      amount: 250.5,
      unit: 'per_use',
      currency: 'ARS',
    });

    await expect(
      service.updateCustomService(
        LOT_A1,
        created.id,
        { pricing: { type: PricingType.INCLUDED, amount: 10 } as any },
        OWNER_A,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateCustomService(
        LOT_A1,
        created.id,
        {
          pricing: {
            type: PricingType.EXTRA_COST,
            amount: -5,
            unit: PriceUnit.FIXED,
          },
        },
        OWNER_A,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.deleteCustomService(LOT_A1, created.id, OWNER_A);
    expect(customs.rows).toHaveLength(0);
  });

  it('rechaza títulos vacíos o duplicados en el mismo estacionamiento, pero no en otro', async () => {
    await service.createCustomService(
      LOT_A1,
      { title: 'Lavado', pricing: { type: PricingType.FREE } },
      OWNER_A,
    );
    await expect(
      service.createCustomService(
        LOT_A1,
        { title: 'lavado', pricing: { type: PricingType.FREE } },
        OWNER_A,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.createCustomService(
        LOT_A1,
        { title: '   ', pricing: { type: PricingType.FREE } },
        OWNER_A,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createCustomService(
        LOT_A2,
        { title: 'Lavado', pricing: { type: PricingType.FREE } },
        OWNER_A,
      ),
    ).resolves.toBeDefined();
  });

  it('un servicio personalizado pertenece a un único estacionamiento', async () => {
    const s = await service.createCustomService(
      LOT_A1,
      { title: 'Wifi', pricing: { type: PricingType.INCLUDED } },
      OWNER_A,
    );
    expect(
      (await service.getAdminProfile(LOT_A2, OWNER_A)).customServices,
    ).toHaveLength(0);
    // Mismo dueño, otro lote: no puede editarlo ni borrarlo usando el id
    await expect(
      service.updateCustomService(LOT_A2, s.id, { title: 'X' }, OWNER_A),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.deleteCustomService(LOT_A2, s.id, OWNER_A),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(customs.rows).toHaveLength(1);
  });

  // 12 y 13
  it('un dueño no puede modificar otro establecimiento; empleados, clientes y admin tampoco', async () => {
    await expect(
      service.updateProfile(LOT_B, { description: 'x' }, OWNER_A),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.getAdminProfile(LOT_B, OWNER_A),
    ).rejects.toBeInstanceOf(ForbiddenException);
    for (const role of [
      UserRole.PARKING_EMPLOYEE,
      UserRole.CLIENT,
      UserRole.ADMIN,
    ]) {
      await expect(
        service.updateProfile(
          LOT_A1,
          { description: 'x' },
          { id: OWNER_A.id, role },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.createCustomService(
          LOT_A1,
          { title: 'x', pricing: { type: PricingType.FREE } },
          { id: OWNER_A.id, role },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    await expect(
      service.updateProfile('no-existe', {}, OWNER_A),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(profiles.rows).toHaveLength(0);
  });

  // 10 y 11
  it('la vista pública muestra solo lo activo y con precio definido', async () => {
    await service.updateProfile(
      LOT_A1,
      {
        description: 'Cerca del centro',
        physicalFeatures: [
          { code: 'covered', enabled: true },
          { code: 'open_air', enabled: false },
        ],
        services: [
          {
            code: 'car_wash',
            enabled: true,
            conditions: 'Lun a vie',
            pricing: {
              type: PricingType.EXTRA_COST,
              amount: 5000,
              unit: PriceUnit.PER_VEHICLE,
            },
          },
          {
            code: 'helmet_storage',
            enabled: false,
            pricing: { type: PricingType.INCLUDED },
          },
        ],
      },
      OWNER_A,
    );
    await service.createCustomService(
      LOT_A1,
      { title: 'Activo', pricing: { type: PricingType.FREE } },
      OWNER_A,
    );
    await service.createCustomService(
      LOT_A1,
      {
        title: 'Inactivo',
        isActive: false,
        pricing: { type: PricingType.FREE },
      },
      OWNER_A,
    );

    const pub = await service.getPublicProfile(LOT_A1);
    expect(pub.address).toBe('Calle 1 123');
    expect(pub.physicalFeatures.map((f) => f.code)).toEqual(['covered']);
    expect(pub.services.map((s) => s.name)).toEqual([
      'Limpieza de vehículos',
      'Activo',
    ]);
    expect(pub.services[0]).toMatchObject({
      conditions: 'Lun a vie',
      pricing: { type: 'extra_cost', amount: 5000 },
    });
    expect(pub.hasDetails).toBe(true);
    expect(JSON.stringify(pub)).not.toContain('user-a');
  });

  it('la vista pública de un estacionamiento sin datos indica que no hay detalles', async () => {
    const pub = await service.getPublicProfile(LOT_B);
    expect(pub).toMatchObject({
      description: null,
      physicalFeatures: [],
      services: [],
      hasDetails: false,
    });
  });

  it('la vista pública no expone estacionamientos inactivos', async () => {
    lots.rows[2].isActive = false;
    await expect(service.getPublicProfile(LOT_B)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
