import { Injectable, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { ParkingLot } from './entities/parking-lot.entity';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { ParkingOwner } from '../parking-owners/entities/parking-owner.entity';
import { UserRole } from '../users/entities/user.entity';
import { ParkingLotOwnerResponseDto, SpaceOwnerDto } from './dto/parking-lot-owner-response.dto';
import { Rate } from '../rates/entities/rate.entity';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { ParkingLotNearbyResponseDto } from './dto/parking-lot-nearby-response.dto';
import { Space } from '../spaces/entities/space.entity';
import { FindAllParkingLotsDto, SortByField, SortOrder } from './dto/find-all-parking-lots.dto';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { QRService } from '../common/qr/qr.service';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';

@Injectable()
export class ParkingLotsService {
  constructor(
    @InjectRepository(ParkingLot)
    private parkingLotRepository: Repository<ParkingLot>,
    @InjectRepository(ParkingOwner)
    private parkingOwnerRepository: Repository<ParkingOwner>,
    @InjectRepository(Rate)
    private rateRepository: Repository<Rate>,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(ParkingEmployee)
    private parkingEmployeeRepository:Repository<ParkingEmployee>,
    private cloudinaryService: CloudinaryService,
    private qrService: QRService,
  ) { }

  async create(createDto: CreateParkingLotDto, userId: string, userRole: string): Promise<ParkingLot> {
    // Si es PARKING_OWNER, verificar que el dueño existe y es el mismo usuario
    if (userRole === UserRole.PARKING_OWNER) {
      const owner = await this.parkingOwnerRepository.findOne({
        where: { userId: userId }, // ← buscar por userId
      });
      if (!owner) {
        throw new UnauthorizedException('No tienes un perfil de dueño de estacionamiento');
      }
      createDto.ownerId = owner.id; // ← asignar el ID del perfil, no el userId
    }
    // Si es ADMIN, usar el ownerId que viene en el DTO
    else if (userRole === UserRole.ADMIN) {
      const owner = await this.parkingOwnerRepository.findOne({
        where: { id: createDto.ownerId },
      });
      if (!owner) {
        throw new NotFoundException(`Parking owner with ID ${createDto.ownerId} not found`);
      }
    }

    const defaultSettings = {
      allowOnlineReservations: true,
      cancellationMinutesBefore: 30,
      reservationHoldMinutes: 120,
      blockSpaceHoursBefore: 2,
      maxReservationHours: 24,
      maxAdvanceDays: 7,
    };

    // Combinar settings enviados con defaults
    const finalSettings = {
      ...defaultSettings,
      ...createDto.settings,
    };

    const checkInQR = await this.qrService.generateQRForType('check-in');
    const checkOutQR = await this.qrService.generateQRForType('check-out');

    const parkingLot = this.parkingLotRepository.create({
      ownerId: createDto.ownerId,
      name: createDto.name,
      address: createDto.address,
      latitude: createDto.latitude,
      longitude: createDto.longitude,
      openTime: createDto.openTime,
      closeTime: createDto.closeTime,
      settings: finalSettings,
      checkInToken: checkInQR.token,
      checkInQrUrl: checkInQR.qrUrl,
      checkOutToken: checkOutQR.token,
      checkOutQrUrl: checkOutQR.qrUrl,
      qrUpdatedAt: new Date(),
      isActive: true,
    });
    return this.parkingLotRepository.save(parkingLot);
  }

  async findAll(): Promise<ParkingLot[]> {
    return this.parkingLotRepository.find({
      relations: ['owner', 'spaces'],
      where: { isActive: true },
    });
  }

  async findOne(id: string): Promise<ParkingLot> {
    const parkingLot = await this.parkingLotRepository.findOne({
      where: { id },
      relations: ['owner', 'spaces', 'rates'],
    });
    if (!parkingLot) {
      throw new NotFoundException(`Parking lot with ID ${id} not found`);
    }
    return parkingLot;
  }

  async findByOwner(ownerId: string, currentUserId: string, currentUserRole: string): Promise<ParkingLot[]> {
    // Verificar permisos
    if (currentUserRole === UserRole.PARKING_OWNER) {
      const owner = await this.parkingOwnerRepository.findOne({
        where: { userId: currentUserId },
      });
      if (!owner || owner.id !== ownerId) {
        throw new UnauthorizedException('No tienes permiso para ver los estacionamientos de este dueño');
      }
    } else if (currentUserRole !== UserRole.ADMIN) {
      throw new UnauthorizedException('No tienes permiso para realizar esta acción');
    }

    return this.parkingLotRepository.find({
      where: { ownerId },
      relations: ['spaces'],
    });
  }

  async findNearby(lat: number, lng: number, radius: number = 1000): Promise<ParkingLotNearbyResponseDto[]> {
    if (isNaN(radius) || radius <= 0) {
      radius = 1000;
    }

    // 1. Buscar parkings cercanos con distancia
    const parkingLots = await this.parkingLotRepository
      .createQueryBuilder('pl')
      .addSelect(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(pl.latitude)) * 
        cos(radians(pl.longitude) - radians(:lng)) + 
        sin(radians(:lat)) * sin(radians(pl.latitude)))) * 1000`,
        'distance'
      )
      .where(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(pl.latitude)) * 
        cos(radians(pl.longitude) - radians(:lng)) + 
        sin(radians(:lat)) * sin(radians(pl.latitude)))) <= :radius`,
        { lat, lng, radius: radius / 1000 }
      )
      .andWhere('pl.isActive = :isActive', { isActive: true })
      .leftJoinAndSelect('pl.spaces', 'spaces', 'spaces.isActive = true') // Solo traer espacios activos
      .leftJoinAndSelect('pl.rates', 'rates', 'rates.isActive = true') // Solo traer tarifas activas
      .orderBy('distance', 'ASC')
      .getRawAndEntities();


    // 2. Calcular disponibilidad para cada parking
    const results: ParkingLotNearbyResponseDto[] = [];

    for (const item of parkingLots.entities) {
      const spaces = item.spaces || [];
      const total = spaces.length;
      const available = spaces.filter(s => s.status === 'available').length;
      const occupied = spaces.filter(s => s.status === 'occupied').length;
      const reserved = spaces.filter(s => s.status === 'reserved').length;

      // Obtener la distancia del resultado raw
      const raw = parkingLots.raw.find(r => r.pl_id === item.id);
      const distance = raw ? Math.round(parseFloat(raw.distance)) : 0;

      results.push({
        id: item.id,
        name: item.name,
        address: item.address,
        latitude: item.latitude,
        longitude: item.longitude,
        distance,
        openTime: item.openTime,
        closeTime: item.closeTime,
        rates: item.rates.map(rate => (
          {
            id: rate.id,
            vehicleType: rate.vehicleType,
            price: rate.pricePerHour,
          })),
        availability: {
          total,
          available,
          occupied,
          reserved,
        },
        imageUrl: item.imageUrl,
      });
    }

    return results;
  }

  async getRealTimeAvailability(parkingLotId: string): Promise<{ total: number; available: number; occupied: number; reserved: number }> {
    const spaces = await this.spaceRepository.find({
      where: { parkingLotId, isActive: true },
    });

    return {
      total: spaces.length,
      available: spaces.filter(s => s.status === 'available').length,
      occupied: spaces.filter(s => s.status === 'occupied').length,
      reserved: spaces.filter(s => s.status === 'reserved').length,
    };
  }


async update(id: string, updateDto: UpdateParkingLotDto, userId: string, userRole: string): Promise<ParkingLot> {
  const parkingLot = await this.findOne(id);

  // Verificar permisos
  if (userRole === UserRole.PARKING_OWNER) {
    const owner = await this.parkingOwnerRepository.findOne({
      where: { userId },
    });
    if (!owner || parkingLot.ownerId !== owner.id) {
      throw new UnauthorizedException('No tienes permiso para modificar este estacionamiento');
    }
  } else if (userRole !== UserRole.ADMIN) {
    throw new UnauthorizedException('No tienes permiso para realizar esta acción');
  }

  // ✅ Construir objeto de actualización con merge profundo para settings
  const updateData: any = {};

  // Campos simples
  if (updateDto.name !== undefined) updateData.name = updateDto.name;
  if (updateDto.address !== undefined) updateData.address = updateDto.address;
  if (updateDto.latitude !== undefined) updateData.latitude = updateDto.latitude;
  if (updateDto.longitude !== undefined) updateData.longitude = updateDto.longitude;
  if (updateDto.openTime !== undefined) updateData.openTime = updateDto.openTime;
  if (updateDto.closeTime !== undefined) updateData.closeTime = updateDto.closeTime;
  if (updateDto.isActive !== undefined) updateData.isActive = updateDto.isActive;
  if (updateDto.imageUrl !== undefined) updateData.imageUrl = updateDto.imageUrl;

  // ✅ Merge profundo para settings
  if (updateDto.settings) {
    updateData.settings = {
      ...parkingLot.settings,      // Mantener valores existentes
      ...updateDto.settings,       // Sobrescribir con los nuevos
    };
  }

  // Aplicar todos los cambios
  Object.assign(parkingLot, updateData);
  return this.parkingLotRepository.save(parkingLot);
}

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const parkingLot = await this.findOne(id);

    // Verificar permisos
    if (userRole === UserRole.PARKING_OWNER) {
      const owner = await this.parkingOwnerRepository.findOne({
        where: { userId },
      });
      if (!owner || parkingLot.ownerId !== owner.id) {
        throw new UnauthorizedException('No tienes permiso para eliminar este estacionamiento');
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new UnauthorizedException('No tienes permiso para realizar esta acción');
    }

    const result = await this.parkingLotRepository.update(id, { isActive: false });
    if (result.affected === 0) {
      throw new NotFoundException(`Parking lot with ID ${id} not found`);
    }
  }

  async getAvailability(id: string): Promise<{ total: number; available: number; occupied: number; reserved: number }> {
    const parkingLot = await this.findOne(id);
    const spaces = parkingLot.spaces || [];

    const total = spaces.length;
    const available = spaces.filter(s => s.status === 'available').length;
    const occupied = spaces.filter(s => s.status === 'occupied').length;
    const reserved = spaces.filter(s => s.status === 'reserved').length;

    return { total, available, occupied, reserved };
  }

  async getOwnerParkingLot(ownerId: string): Promise<ParkingLotOwnerResponseDto> {
    // 1. Obtener el perfil del dueño
    const owner = await this.parkingOwnerRepository.findOne({
      where: { userId: ownerId },
    });

    if (!owner) {
      throw new NotFoundException('Perfil de dueño no encontrado');
    }

    // 2. Obtener el parking lot (solo uno para MVP)
    const parkingLot = await this.parkingLotRepository.findOne({
      where: { ownerId: owner.id, isActive: true },
      relations: ['spaces'],
    });

    if (!parkingLot) {
      throw new NotFoundException('No tienes ningún estacionamiento registrado');
    }

    // 3. Calcular estadísticas
    const spaces = parkingLot.spaces || [];
    const totalSpaces = spaces.length;
    const availableSpaces = spaces.filter(s => s.status === 'available').length;
    const occupiedSpaces = spaces.filter(s => s.status === 'occupied').length;
    const reservedSpaces = spaces.filter(s => s.status === 'reserved').length;
    const maintenanceSpaces = spaces.filter(s => s.status === 'maintenance').length;

    // 4. Mapear espacios para el frontend
    const spacesDto: SpaceOwnerDto[] = spaces.map(space => ({
      id: space.id,
      spaceNumber: space.spaceNumber,
      status: space.status,
      allowedVehicleTypes: space.allowedVehicleTypes,
      isReserved: space.isReserved,
      reservedUntil: space.reservedUntil,
      occupiedSince: space.occupiedSince,
      occupiedByVehiclePlate: space.occupiedByVehiclePlate,
      metadata: space.metadata,
    }));

    // 5. Obtener tarifas (opcional)
    const rates = await this.rateRepository.find({
      where: { parkingLotId: parkingLot.id, isActive: true },
      select: ['vehicleType', 'pricePerHour'],
    });

    return {
      id: parkingLot.id,
      name: parkingLot.name,
      address: parkingLot.address,
      latitude: parkingLot.latitude,
      longitude: parkingLot.longitude,
      openTime: parkingLot.openTime,
      closeTime: parkingLot.closeTime,
      settings: parkingLot.settings,
      isActive: parkingLot.isActive,
      stats: {
        totalSpaces,
        availableSpaces,
        occupiedSpaces,
        reservedSpaces,
        maintenanceSpaces,
      },
      spaces: spacesDto,
      rates,
      imageUrl: parkingLot.imageUrl || '',
    };
  }

  async getEmployeeParkingLot(employeeUserId: string): Promise<ParkingLotOwnerResponseDto> {
    // 1. Obtener el perfil del dueño
    const employee = await this.parkingEmployeeRepository.findOne({
      where: { userId: employeeUserId },
    });

    if (!employee) {
      throw new NotFoundException('Perfil de empleado no encontrado');
    }

    // 2. Obtener el parking lot (solo uno para MVP)
    const parkingLot = await this.parkingLotRepository.findOne({
      where: { id:employee.parkingLotId, isActive: true },
      relations: ['spaces'],
    });

    if (!parkingLot) {
      throw new NotFoundException('No tienes ningún estacionamiento registrado');
    }

    // 3. Calcular estadísticas
    const spaces = parkingLot.spaces || [];
    const totalSpaces = spaces.length;
    const availableSpaces = spaces.filter(s => s.status === 'available').length;
    const occupiedSpaces = spaces.filter(s => s.status === 'occupied').length;
    const reservedSpaces = spaces.filter(s => s.status === 'reserved').length;
    const maintenanceSpaces = spaces.filter(s => s.status === 'maintenance').length;

    // 4. Mapear espacios para el frontend
    const spacesDto: SpaceOwnerDto[] = spaces.map(space => ({
      id: space.id,
      spaceNumber: space.spaceNumber,
      status: space.status,
      allowedVehicleTypes: space.allowedVehicleTypes,
      isReserved: space.isReserved,
      reservedUntil: space.reservedUntil,
      occupiedSince: space.occupiedSince,
      occupiedByVehiclePlate: space.occupiedByVehiclePlate,
      metadata: space.metadata,
    }));

    // 5. Obtener tarifas (opcional)
    const rates = await this.rateRepository.find({
      where: { parkingLotId: parkingLot.id, isActive: true },
      select: ['vehicleType', 'pricePerHour'],
    });

    return {
      id: parkingLot.id,
      name: parkingLot.name,
      address: parkingLot.address,
      latitude: parkingLot.latitude,
      longitude: parkingLot.longitude,
      openTime: parkingLot.openTime,
      closeTime: parkingLot.closeTime,
      settings: parkingLot.settings,
      isActive: parkingLot.isActive,
      stats: {
        totalSpaces,
        availableSpaces,
        occupiedSpaces,
        reservedSpaces,
        maintenanceSpaces,
      },
      spaces: spacesDto,
      rates,
      imageUrl: parkingLot.imageUrl || '',
    };
  }




  /**
  * Obtener todos los estacionamientos con paginación y filtros (solo admin)
  */
  async findAllPaginated(queryDto: FindAllParkingLotsDto): Promise<{
    data: ParkingLot[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Valores por defecto
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const search = queryDto.search;
    const status = queryDto.status || 'all';
    const sortBy = queryDto.sortBy || SortByField.CREATED_AT;
    const sortOrder = queryDto.sortOrder || SortOrder.DESC;

    const skip = (page - 1) * limit;

    // Construir query builder
    const queryBuilder = this.parkingLotRepository
      .createQueryBuilder('pl')
      .leftJoinAndSelect('pl.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'user')
      .leftJoinAndSelect('pl.spaces', 'spaces')
      .where('1=1');

    // Filtro por búsqueda
    if (search) {
      queryBuilder.andWhere(
        new Brackets(qb => {
          qb.where('pl.name ILIKE :search')
            .orWhere('pl.address ILIKE :search')
            .orWhere('owner.businessName ILIKE :search')
            .orWhere('user.email ILIKE :search');
        }),
        { search: `%${search}%` }
      );
    }

    // Filtro por estado
    if (status === 'active') {
      queryBuilder.andWhere('pl.isActive = :isActive', { isActive: true });
    } else if (status === 'inactive') {
      queryBuilder.andWhere('pl.isActive = :isActive', { isActive: false });
    }

    // Ordenamiento
    const orderField = sortBy === SortByField.NAME ? 'pl.name' :
      sortBy === SortByField.CREATED_AT ? 'pl.createdAt' :
        'pl.updatedAt';
    queryBuilder.orderBy(orderField, sortOrder);

    // Paginación
    queryBuilder.skip(skip).take(limit);

    // Ejecutar consulta
    const [data, total] = await queryBuilder.getManyAndCount();

    // Calcular estadísticas para cada parking
    for (const parking of data) {
      const spaces = parking.spaces || [];
      parking['stats'] = {
        totalSpaces: spaces.length,
        availableSpaces: spaces.filter(s => s.status === 'available').length,
        occupiedSpaces: spaces.filter(s => s.status === 'occupied').length,
        reservedSpaces: spaces.filter(s => s.status === 'reserved').length,
        maintenanceSpaces: spaces.filter(s => s.status === 'maintenance').length,
      };
    }

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Activar/Desactivar un estacionamiento (solo admin)
   */
  async toggleStatus(id: string, isActive: boolean, userId: string, userRole: string): Promise<ParkingLot> {
    // Verificar que sea admin
    if (userRole !== UserRole.ADMIN) {
      throw new UnauthorizedException('No tienes permiso para cambiar el estado de este estacionamiento');
    }

    const parkingLot = await this.findOne(id);

    parkingLot.isActive = isActive;
    return this.parkingLotRepository.save(parkingLot);
  }

  /**
   * Actualizar solo la imagen de un estacionamiento
   */
  async updateImage(id: string, imageUrl: string, userId: string, userRole: string): Promise<ParkingLot> {
    const parkingLot = await this.findOne(id);

    // Verificar permisos
    if (userRole === UserRole.PARKING_OWNER) {
      const owner = await this.parkingOwnerRepository.findOne({
        where: { userId },
      });
      if (!owner || parkingLot.ownerId !== owner.id) {
        throw new UnauthorizedException('No tienes permiso para modificar este estacionamiento');
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new UnauthorizedException('No tienes permiso para realizar esta acción');
    }

    // Opcional: Eliminar imagen anterior de Cloudinary si existe
    if (parkingLot.imageUrl) {
      const publicId = this.cloudinaryService.extractPublicIdFromUrl(parkingLot.imageUrl);
      if (publicId) {
        await this.cloudinaryService.deleteImage(publicId).catch(console.error);
      }
    }

    parkingLot.imageUrl = imageUrl;
    return this.parkingLotRepository.save(parkingLot);
  }

  /**
   * Extraer public_id de una URL de Cloudinary
   */
  private extractPublicIdFromUrl(url: string): string | null {
    if (!url) return null;

    // Patrón para extraer el public_id de Cloudinary
    // Ejemplo: https://res.cloudinary.com/.../upload/v123456/parking_lots/abc123.jpg
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.\w+$/);
    return match ? match[1] : null;
  }

  /**
   * Generar o regenerar QR para un estacionamiento
   */
  async generateQRCodes(parkingLotId: string, userId: string, userRole: string): Promise<ParkingLot> {
    // Verificar permisos
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PARKING_OWNER) {
      throw new UnauthorizedException('No tienes permiso para generar QR de este estacionamiento');
    }

    const parkingLot = await this.findOne(parkingLotId);
    if (!parkingLot) {
      throw new NotFoundException('Estacionamiento no encontrado');
    }

    // Generar QR para check-in
    const checkInQR = await this.qrService.generateQRForType('check-in');

    // Generar QR para check-out
    const checkOutQR = await this.qrService.generateQRForType('check-out');

    // Actualizar parking lot
    parkingLot.checkInToken = checkInQR.token;
    parkingLot.checkInQrUrl = checkInQR.qrUrl;
    parkingLot.checkOutToken = checkOutQR.token;
    parkingLot.checkOutQrUrl = checkOutQR.qrUrl;
    parkingLot.qrUpdatedAt = new Date();

    await this.parkingLotRepository.save(parkingLot);
    return parkingLot;
  }

  /**
   * Regenerar solo un tipo específico de QR
   */
  async regenerateQRType(parkingLotId: string, type: 'check-in' | 'check-out', userId: string, userRole: string): Promise<ParkingLot> {
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PARKING_OWNER) {
      throw new UnauthorizedException('No tienes permiso para regenerar QR');
    }

    const parkingLot = await this.findOne(parkingLotId);
    if (!parkingLot) {
      throw new NotFoundException('Estacionamiento no encontrado');
    }

    const qr = await this.qrService.generateQRForType(type);

    if (type === 'check-in') {
      parkingLot.checkInToken = qr.token;
      parkingLot.checkInQrUrl = qr.qrUrl;
    } else {
      parkingLot.checkOutToken = qr.token;
      parkingLot.checkOutQrUrl = qr.qrUrl;
    }
    parkingLot.qrUpdatedAt = new Date();

    await this.parkingLotRepository.save(parkingLot);
    return parkingLot;
  }

  /**
   * Obtener QR de un estacionamiento
   */
  async getParkingQRCodes(parkingLotId: string): Promise<{ checkIn: { token: string; qrUrl: string } | null; checkOut: { token: string; qrUrl: string } | null }> {
    const parkingLot = await this.findOne(parkingLotId);

    return {
      checkIn: parkingLot.checkInToken ? { token: parkingLot.checkInToken, qrUrl: parkingLot.checkInQrUrl! } : null,
      checkOut: parkingLot.checkOutToken ? { token: parkingLot.checkOutToken, qrUrl: parkingLot.checkOutQrUrl! } : null,
    };
  }

  async validateQRToken(token: string, type: 'check-in' | 'check-out'): Promise<ParkingLot> {
    const parkingLot = await this.parkingLotRepository.findOne({
      where: type === 'check-in'
        ? { checkInToken: token, isActive: true }
        : { checkOutToken: token, isActive: true },
      relations: ['rates'],
    });

    if (!parkingLot) {
      throw new NotFoundException('QR inválido o estacionamiento no encontrado');
    }

    return parkingLot;
  }
}