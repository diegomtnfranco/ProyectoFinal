// backend/src/modules/seed/seed.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { ClientProfile, VehicleTypeEnum } from '../client-profiles/entities/client-profile.entity';
import { ParkingOwner } from '../parking-owners/entities/parking-owner.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { Space, SpaceStatus } from '../spaces/entities/space.entity';
import { Rate } from '../rates/entities/rate.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { QRService } from '../common/qr/qr.service';

// ============ INTERFACES ============
interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface ParkingData {
  ownerName: string;
  businessName: string;
  email: string;
  phone: string;
  location: Location;
  totalSpaces: number;
}

// ✅ Interfaz para el resultado de createOwnerWithParking
interface OwnerWithParkingResult {
  user: User;
  owner: ParkingOwner;
  parkingLot: ParkingLot;
  spacesCount: number;
  rates: Rate[];
}

// ✅ Interfaz para el resultado de createEmployee
interface EmployeeResult {
  user: User;
  name: string;
}

// ✅ Interfaz para el resultado del seed
export interface SeedResult {
  message: string;
  data: {
    admin: { email: string; password: string };
    client: { email: string; password: string };
    employee: { email: string; password: string; name: string } | null;
    parkings: Array<{
      owner: { email: string; password: string; businessName: string };
      parkingLot: { id: string; name: string; address: string; spaces: number };
    }>;
  };
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  private hasRun = false;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ClientProfile)
    private clientRepository: Repository<ClientProfile>,
    @InjectRepository(ParkingOwner)
    private parkingOwnerRepository: Repository<ParkingOwner>,
    @InjectRepository(ParkingLot)
    private parkingLotRepository: Repository<ParkingLot>,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(Rate)
    private rateRepository: Repository<Rate>,
    @InjectRepository(ParkingEmployee)
    private parkingEmployeeRepository: Repository<ParkingEmployee>,
    private dataSource: DataSource,
    private qrService: QRService,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'production' || process.env.RUN_SEED_ON_START === 'true') {
      await this.autoSeed();
    }
  }

  private async autoSeed() {
    if (this.hasRun) return;
    
    try {
      const userCount = await this.userRepository.count();
      
      if (userCount === 0) {
        this.logger.log('📦 Base de datos vacía. Ejecutando seed automático...');
        await this.seed();
        this.logger.log('✅ Seed automático completado.');
      } else {
        this.logger.log('✅ Base de datos ya tiene datos. Seed automático omitido.');
      }
    } catch (error) {
      this.logger.error('❌ Error en seed automático:', error);
    } finally {
      this.hasRun = true;
    }
  }

  // ============ UBICACIONES ============
  private getLocations(): Location[] {
    return [
      // San Miguel de Tucumán
      { name: 'Plaza Independencia', address: 'Plaza Independencia, San Miguel de Tucumán', lat: -26.814500, lng: -65.203850 },
      { name: 'Casa Histórica', address: 'Casa Histórica de la Independencia, San Miguel de Tucumán', lat: -26.820750, lng: -65.205730 },
      { name: 'Parque 9 de Julio', address: 'Parque 9 de Julio, San Miguel de Tucumán', lat: -26.830610, lng: -65.188720 },
      { name: 'Terminal de Ómnibus', address: 'Terminal de Ómnibus, San Miguel de Tucumán', lat: -26.837890, lng: -65.182410 },
      { name: 'Basílica La Merced', address: 'Basílica Nuestra Señora de La Merced, San Miguel de Tucumán', lat: -26.815910, lng: -65.208150 },
      { name: 'Plaza Urquiza', address: 'Plaza Urquiza, San Miguel de Tucumán', lat: -26.808060, lng: -65.201620 },
      { name: 'Estadio Monumental', address: 'Estadio Monumental José Fierro, San Miguel de Tucumán', lat: -26.803320, lng: -65.195030 },
      { name: 'Plaza Alberdi', address: 'Plaza Alberdi, San Miguel de Tucumán', lat: -26.801640, lng: -65.207390 },
      { name: 'Teatro San Martín', address: 'Teatro San Martín, San Miguel de Tucumán', lat: -26.817340, lng: -65.201910 },
      { name: 'Parque Avellaneda', address: 'Parque Avellaneda, San Miguel de Tucumán', lat: -26.802950, lng: -65.220190 },
      // Yerba Buena
      { name: 'Rotonda Aconquija-Perón', address: 'Av. Aconquija y Av. Perón, Yerba Buena', lat: -26.811800, lng: -65.281810 },
      { name: 'Yerba Buena Shopping', address: 'Yerba Buena Shopping, Yerba Buena', lat: -26.807830, lng: -65.298280 },
      { name: 'Plaza Marcos Paz', address: 'Plaza Marcos Paz, Yerba Buena', lat: -26.813630, lng: -65.295410 },
      { name: 'Jardín Botánico UNT', address: 'Jardín Botánico de la UNT, Yerba Buena', lat: -26.807180, lng: -65.312980 },
      { name: 'Solar del Cerro', address: 'Solar del Cerro, Yerba Buena', lat: -26.813290, lng: -65.289450 },
      { name: 'Country Jockey Club', address: 'Country Jockey Club, Yerba Buena', lat: -26.832960, lng: -65.290680 },
      { name: 'Parque El Provincial', address: 'Parque El Provincial, Yerba Buena', lat: -26.823610, lng: -65.298170 },
      { name: 'Plaza Vieja', address: 'Las Piedras y Av. Aconquija, Yerba Buena', lat: -26.815890, lng: -65.306050 },
      { name: 'Portal Shopping', address: 'Portal Shopping, Yerba Buena', lat: -26.810570, lng: -65.267820 },
      { name: 'Rotonda Horco Molle', address: 'Rotonda de Horco Molle, Yerba Buena', lat: -26.800160, lng: -65.310700 },
    ];
  }

  // ============ DATOS DE PARKINGS ============
  private getParkingsData(): ParkingData[] {
    const locations = this.getLocations();
    const parkings: ParkingData[] = [];

    locations.forEach((loc, index) => {
      const number = (index + 1).toString().padStart(2, '0');
      parkings.push({
        ownerName: `Dueño ${number}`,
        businessName: `Estacionamiento ${loc.name}`,
        email: `owner${number}@estacionapp.com`,
        phone: `+549381${String(1000000 + index * 10000).padStart(7, '0')}`,
        location: loc,
        totalSpaces: 10 + (index % 6) * 5,
      });
    });

    return parkings;
  }

  async checkDatabase() {
    const userCount = await this.userRepository.count();
    const parkingLotCount = await this.parkingLotRepository.count();
    const spaceCount = await this.spaceRepository.count();

    return {
      hasData: userCount > 0 && parkingLotCount > 0,
      counts: {
        users: userCount,
        parkingLots: parkingLotCount,
        spaces: spaceCount,
      },
      message: userCount > 0 
        ? 'Base de datos con datos existentes' 
        : 'Base de datos vacía. Ejecuta GET /seed para llenarla.',
    };
  }

  async seed(): Promise<SeedResult> {
    this.logger.log('🚀 Iniciando seeding de la base de datos...');

    try {
      const existingUsers = await this.userRepository.count();
      if (existingUsers > 0) {
        this.logger.warn('⚠️ La base de datos ya tiene datos. Omitiendo seed...');
        return {
          message: 'La base de datos ya tiene datos. Seed omitido.',
          data: {
            admin: { email: 'admin@estacionapp.com', password: 'Admin123!' },
            client: { email: 'cliente@test.com', password: 'Cliente123!' },
            employee: null,
            parkings: [],
          },
        };
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const admin = await this.createAdmin(queryRunner);
        const client = await this.createClient(queryRunner);

        // ✅ Tipar employee como EmployeeResult | null
        let employee: EmployeeResult | null = null;

        // ✅ Tipar createdParkings como OwnerWithParkingResult[]
        const createdParkings: OwnerWithParkingResult[] = [];

        const parkingsData = this.getParkingsData();

        for (let i = 0; i < parkingsData.length; i++) {
          const data = parkingsData[i];
          const result = await this.createOwnerWithParking(queryRunner, data);
          createdParkings.push(result);

          if (i === 0) {
            employee = await this.createEmployee(queryRunner, result.parkingLot.id);
          }
        }

        await queryRunner.commitTransaction();

        const result: SeedResult = {
          message: 'Seed completado exitosamente',
          data: {
            admin: { email: admin.email, password: 'Admin123!' },
            client: { email: client.email, password: 'Cliente123!' },
            employee: employee ? {
              email: employee.user.email,
              password: 'Empleado123!',
              name: employee.name,
            } : null,
            parkings: createdParkings.map(p => ({
              owner: {
                email: p.user.email,
                password: 'Dueño123!',
                businessName: p.owner.businessName,
              },
              parkingLot: {
                id: p.parkingLot.id,
                name: p.parkingLot.name,
                address: p.parkingLot.address,
                spaces: p.spacesCount,
              },
            })),
          },
        };

        this.logger.log('✅ Seeding completado exitosamente!');
        this.logger.log(`📊 Creados ${createdParkings.length} estacionamientos`);
        this.logger.log('📊 Credenciales de prueba:');
        this.logger.log(`  Admin: admin@estacionapp.com / Admin123!`);
        this.logger.log(`  Cliente: cliente@test.com / Cliente123!`);
        this.logger.log(`  Empleado: empleado@test.com / Empleado123!`);
        this.logger.log(`  ${createdParkings.length} dueños: owner01@estacionapp.com ... owner${String(createdParkings.length).padStart(2, '0')}@estacionapp.com / Dueño123!`);

        return result;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error('❌ Error en seeding:', error);
      throw error;
    }
  }

  private async createAdmin(queryRunner: any): Promise<User> {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const admin = this.userRepository.create({
      email: 'admin@estacionapp.com',
      passwordHash: hashedPassword,
      role: UserRole.ADMIN,
      isVerified: true,
      isActive: true,
    });
    return queryRunner.manager.save(admin);
  }

  private async createClient(queryRunner: any): Promise<User> {
    const hashedPassword = await bcrypt.hash('Cliente123!', 10);
    const client = this.userRepository.create({
      email: 'cliente@test.com',
      passwordHash: hashedPassword,
      role: UserRole.CLIENT,
      isVerified: true,
      isActive: true,
    });
    await queryRunner.manager.save(client);

    const profile = this.clientRepository.create({
      userId: client.id,
      name: 'Juan Cliente',
      phone: '+5493811234567',
      defaultVehiclePlate: 'ABC123',
      defaultVehicleType: VehicleTypeEnum.CAR,
    });
    await queryRunner.manager.save(profile);

    return client;
  }

  // ✅ Método tipado correctamente
  private async createOwnerWithParking(queryRunner: any, data: ParkingData): Promise<OwnerWithParkingResult> {
    const hashedPassword = await bcrypt.hash('Dueño123!', 10);
    const ownerUser = this.userRepository.create({
      email: data.email,
      passwordHash: hashedPassword,
      role: UserRole.PARKING_OWNER,
      isVerified: true,
      isActive: true,
    });
    await queryRunner.manager.save(ownerUser);

    const parkingOwner = this.parkingOwnerRepository.create({
      userId: ownerUser.id,
      name: data.ownerName,
      businessName: data.businessName,
      cuit: `30-${String(10000000 + Math.floor(Math.random() * 90000000))}-${String(Math.floor(Math.random() * 9) + 1)}`,
      phone: data.phone,
      address: data.location.address,
      isApproved: true,
    });
    await queryRunner.manager.save(parkingOwner);

    const defaultSettings = {
      allowOnlineReservations: true,
      cancellationMinutesBefore: 30,
      reservationHoldMinutes: 120,
      blockSpaceHoursBefore: 2,
      maxReservationHours: 24,
      maxAdvanceDays: 7,
    };

    const checkInQR = await this.qrService.generateQRForType('check-in');
    const checkOutQR = await this.qrService.generateQRForType('check-out');

    const parkingLot = this.parkingLotRepository.create({
      ownerId: parkingOwner.id,
      name: data.businessName,
      address: data.location.address,
      latitude: data.location.lat,
      longitude: data.location.lng,
      openTime: '08:00',
      closeTime: '20:00',
      checkInToken: checkInQR.token,
      checkInQrUrl: checkInQR.qrUrl,
      checkOutToken: checkOutQR.token,
      checkOutQrUrl: checkOutQR.qrUrl,
      qrUpdatedAt: new Date(),
      settings: {
        ...defaultSettings,
        allowOnlineReservations: true,
      },
      isActive: true,
    });
    await queryRunner.manager.save(parkingLot);

    const spaces: Space[] = [];
    const totalSpaces = data.totalSpaces;

    for (let i = 1; i <= totalSpaces; i++) {
      const space = new Space();
      space.parkingLotId = parkingLot.id;
      space.spaceNumber = `${i}`.padStart(3, '0');
      space.allowedVehicleTypes = [VehicleType.CAR, VehicleType.TRUCK, VehicleType.MOTORCYCLE, VehicleType.VAN];
      space.status = SpaceStatus.AVAILABLE;
      space.isActive = true;
      space.isReserved = false;
      space.allowsReservations = true;
      space.metadata = {
        floor: Math.ceil(i / 20),
        zone: i <= totalSpaces / 2 ? 'Norte' : 'Sur',
      };
      spaces.push(space);
    }
    await queryRunner.manager.save(spaces);

    const rates = [
      this.rateRepository.create({
        parkingLotId: parkingLot.id,
        vehicleType: VehicleType.CAR,
        pricePerHour: 2000,
        isActive: true,
      }),
      this.rateRepository.create({
        parkingLotId: parkingLot.id,
        vehicleType: VehicleType.MOTORCYCLE,
        pricePerHour: 1500,
        isActive: true,
      }),
      this.rateRepository.create({
        parkingLotId: parkingLot.id,
        vehicleType: VehicleType.TRUCK,
        pricePerHour: 2500,
        isActive: true,
      }),
      this.rateRepository.create({
        parkingLotId: parkingLot.id,
        vehicleType: VehicleType.VAN,
        pricePerHour: 3000,
        isActive: true,
      }),
    ];
    await queryRunner.manager.save(rates);

    return {
      user: ownerUser,
      owner: parkingOwner,
      parkingLot,
      spacesCount: spaces.length,
      rates,
    };
  }

  // ✅ Método tipado correctamente
  private async createEmployee(queryRunner: any, parkingLotId: string): Promise<EmployeeResult> {
    const hashedPassword = await bcrypt.hash('Empleado123!', 10);
    const employeeUser = this.userRepository.create({
      email: 'empleado@test.com',
      passwordHash: hashedPassword,
      role: UserRole.PARKING_EMPLOYEE,
      isVerified: true,
      isActive: true,
    });
    await queryRunner.manager.save(employeeUser);

    const employee = this.parkingEmployeeRepository.create({
      userId: employeeUser.id,
      parkingLotId: parkingLotId,
      name: 'Pedro Empleado',
      employeeCode: 'EMP-001',
      position: 'Supervisor',
      isActive: true,
    });
    await queryRunner.manager.save(employee);

    return {
      user: employeeUser,
      name: employee.name,
    };
  }

  private async getSeedSummary() {
    const users = await this.userRepository.find();
    const parkingLots = await this.parkingLotRepository.find();
    const spaces = await this.spaceRepository.find();
    const rates = await this.rateRepository.find();

    return {
      users: users.map(u => ({ email: u.email, role: u.role })),
      parkingLots: parkingLots.map(p => ({
        id: p.id,
        name: p.name,
        address: p.address,
        spaces: p.spaces?.length || 0,
      })),
      spaces: spaces.length,
      rates: rates.length,
    };
  }

  async clearDatabase() {
    this.logger.warn('🗑️ Limpiando base de datos...');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const adminUser = await queryRunner.manager.findOne(User, {
        where: { role: UserRole.ADMIN },
      });

      if (adminUser) {
        const adminId = adminUser.id;

        const usersToDelete = await queryRunner.manager
          .createQueryBuilder(User, 'user')
          .where('user.id != :adminId', { adminId })
          .getMany();

        const userIds = usersToDelete.map(u => u.id);

        if (userIds.length > 0) {
          await queryRunner.manager
            .createQueryBuilder()
            .delete()
            .from(ClientProfile)
            .where('userId IN (:...userIds)', { userIds })
            .execute();

          await queryRunner.manager
            .createQueryBuilder()
            .delete()
            .from(ParkingEmployee)
            .where('userId IN (:...userIds)', { userIds })
            .execute();

          const ownersToDelete = await queryRunner.manager
            .createQueryBuilder(ParkingOwner, 'owner')
            .where('owner.userId IN (:...userIds)', { userIds })
            .getMany();

          const ownerIds = ownersToDelete.map(o => o.id);

          if (ownerIds.length > 0) {
            const lotsToDelete = await queryRunner.manager
              .createQueryBuilder(ParkingLot, 'lot')
              .where('lot.ownerId IN (:...ownerIds)', { ownerIds })
              .getMany();

            const lotIds = lotsToDelete.map(l => l.id);

            if (lotIds.length > 0) {
              await queryRunner.manager
                .createQueryBuilder()
                .delete()
                .from(Space)
                .where('parkingLotId IN (:...lotIds)', { lotIds })
                .execute();

              await queryRunner.manager
                .createQueryBuilder()
                .delete()
                .from(Rate)
                .where('parkingLotId IN (:...lotIds)', { lotIds })
                .execute();

              await queryRunner.manager
                .createQueryBuilder()
                .delete()
                .from(ParkingLot)
                .where('id IN (:...lotIds)', { lotIds })
                .execute();
            }

            await queryRunner.manager
              .createQueryBuilder()
              .delete()
              .from(ParkingOwner)
              .where('id IN (:...ownerIds)', { ownerIds })
              .execute();
          }

          await queryRunner.manager
            .createQueryBuilder()
            .delete()
            .from(User)
            .where('id != :adminId', { adminId })
            .execute();

          this.logger.log(`✅ Eliminados ${userIds.length} usuarios. Admin ${adminUser.email} preservado.`);
        } else {
          this.logger.log('ℹ️ No hay usuarios para eliminar (solo admin).');
        }
      } else {
        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(Space)
          .execute();

        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(Rate)
          .execute();

        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(ParkingLot)
          .execute();

        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(ParkingEmployee)
          .execute();

        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(ParkingOwner)
          .execute();

        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(ClientProfile)
          .execute();

        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(User)
          .execute();

        this.logger.log('✅ Base de datos limpiada exitosamente (sin admin encontrado).');
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('❌ Error al limpiar base de datos:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}