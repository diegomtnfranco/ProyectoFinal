import { Injectable, NotFoundException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Space, SpaceStatus } from './entities/space.entity';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { UserRole } from '../users/entities/user.entity';
import {WebsocketGateway} from '../websocket/websocket.gateway';

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @InjectRepository(ParkingLot)
    private parkingLotRepository: Repository<ParkingLot>,
    private websocketGateway: WebsocketGateway,
  ) {}

  async create(createDto: CreateSpaceDto, userId: string, userRole: string): Promise<Space> {
    // Verificar que el parking exista
    const parkingLot = await this.parkingLotRepository.findOne({
      where: { id: createDto.parkingLotId },
      relations: ['owner'],
    });
    if (!parkingLot) {
      throw new NotFoundException(`Parking lot with ID ${createDto.parkingLotId} not found`);
    }

    // Verificar permisos
    if (userRole === UserRole.PARKING_OWNER) {
      if (parkingLot.owner.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para agregar espacios a este estacionamiento');
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción');
    }

    // Verificar si el número de espacio ya existe en este parking
    const existingSpace = await this.spaceRepository.findOne({
      where: {
        parkingLotId: createDto.parkingLotId,
        spaceNumber: createDto.spaceNumber,
      },
    });
    if (existingSpace) {
      throw new ConflictException(`El espacio número ${createDto.spaceNumber} ya existe en este estacionamiento`);
    }

    const space = this.spaceRepository.create({
      parkingLotId: createDto.parkingLotId,
      spaceNumber: createDto.spaceNumber,
      allowedVehicleTypes: createDto.allowedVehicleTypes,
      status: createDto.status || SpaceStatus.AVAILABLE,
      allowsReservations: createDto.allowsReservations,
      isActive: true,
      metadata: {
        floor: 0,
        zone: '',
      }
    });
    return this.spaceRepository.save(space);
  }

  async findAll(): Promise<Space[]> {
    return this.spaceRepository.find({ 
      relations: ['parkingLot'],
      where: { isActive: true },
    });
  }

  async findOne(id: string): Promise<Space> {
    const space = await this.spaceRepository.findOne({
      where: { id },
      relations: ['parkingLot'],
    });
    if (!space) {
      throw new NotFoundException(`Espacio con ID ${id} no encontrado`);
    }
    return space;
  }

  async findByParkingLot(parkingLotId: string): Promise<Space[]> {
    return this.spaceRepository.find({
      where: { parkingLotId, isActive: true },
      relations: ['parkingLot'],
    });
  }

  async update(id: string, updateDto: UpdateSpaceDto, userId: string, userRole: string): Promise<Space> {
    const space = await this.findOne(id);

    // Verificar permisos
    if (userRole === UserRole.PARKING_OWNER) {
      const parkingLot = await this.parkingLotRepository.findOne({
        where: { id: space.parkingLotId },
        relations: ['owner'],
      });
      if (parkingLot?.owner.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para modificar este espacio');
      }
    } else if (userRole === UserRole.PARKING_EMPLOYEE) {
      // Empleados solo pueden cambiar estado, no otros campos
      if (updateDto.allowedVehicleTypes || updateDto.spaceNumber || updateDto.metadata) {
        throw new ForbiddenException('Los empleados solo pueden cambiar el estado del espacio');
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción');
    }

    if (updateDto.allowedVehicleTypes) {
      space.allowedVehicleTypes = updateDto.allowedVehicleTypes;
    }
    if (updateDto.spaceNumber) {
      space.spaceNumber = updateDto.spaceNumber;
    }
    if (updateDto.metadata) {
      space.metadata = updateDto.metadata;
    }
    if (updateDto.status) {
      space.status = updateDto.status;
    }

    this.websocketGateway.emitSpaceUpdate(space.parkingLotId, space.id, space.status);

    return this.spaceRepository.save(space);
  }

  async updateStatus(id: string, status: string, userId: string, userRole: string): Promise<Space> {
    const space = await this.findOne(id);

    // Verificar si el estado es válido
    if (!Object.values(SpaceStatus).includes(status as SpaceStatus)) {
      throw new ConflictException(`Estado inválido: ${status}`);
    }

    // Verificar permisos
    if (userRole === UserRole.PARKING_OWNER) {
      const parkingLot = await this.parkingLotRepository.findOne({
        where: { id: space.parkingLotId },
        relations: ['owner'],
      });
      if (parkingLot?.owner.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para cambiar el estado de este espacio');
      }
    } else if (userRole === UserRole.PARKING_EMPLOYEE) {
      // Empleados solo pueden cambiar a mantenimiento o disponible
      if (status !== SpaceStatus.MAINTENANCE && status !== SpaceStatus.AVAILABLE) {
        throw new ForbiddenException('Los empleados solo pueden marcar espacios como mantenimiento o disponible');
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción');
    }

    space.status = status as SpaceStatus;
    return this.spaceRepository.save(space);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const space = await this.findOne(id);

    // Verificar permisos (solo admin o dueño pueden eliminar)
    if (userRole === UserRole.PARKING_OWNER) {
      const parkingLot = await this.parkingLotRepository.findOne({
        where: { id: space.parkingLotId },
        relations: ['owner'],
      });
      if (parkingLot?.owner.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para eliminar este espacio');
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción');
    }

    // Soft delete
    const result = await this.spaceRepository.update(id, { isActive: false });
    if (result.affected === 0) {
      throw new NotFoundException(`Espacio con ID ${id} no encontrado`);
    }
  }

  async findAvailable(parkingLotId: string, vehicleType?: VehicleType): Promise<Space[]> {
    const query = this.spaceRepository
      .createQueryBuilder('space')
      .where('space.parkingLotId = :parkingLotId', { parkingLotId })
      .andWhere('space.status = :status', { status: SpaceStatus.AVAILABLE })
      .andWhere('space.isActive = :isActive', { isActive: true });

    if (vehicleType) {
      query.andWhere('space.allowedVehicleTypes @> :vehicleType', {
        vehicleType: JSON.stringify([vehicleType]),
      });
    }

    return query.getMany();
  }

  /**
 * Obtener todos los espacios de un estacionamiento (incluyendo inactivos)
 * Solo para admin y dueños
 */
async findAllSpaces(parkingLotId: string): Promise<Space[]> {
  // Verificar que el parking exista
  const parkingLot = await this.parkingLotRepository.findOne({
    where: { id: parkingLotId },
  });
  if (!parkingLot) {
    throw new NotFoundException(`Parking lot with ID ${parkingLotId} not found`);
  }

  // ✅ Obtener TODOS los espacios (sin filtro isActive)
  return this.spaceRepository.find({
    where: { parkingLotId },
    relations: ['parkingLot'],
    order: {
      spaceNumber: 'ASC',
    },
  });
}

 /**
   * Reactivar un espacio (cambiar isActive a true)
   * Solo para admin y dueños
   */
  async reactivateSpace(id: string, isActive: boolean, userId: string, userRole: string): Promise<Space> {
    const space = await this.spaceRepository.findOne({
      where: { id },
      relations: ['parkingLot'],
    });

    if (!space) {
      throw new NotFoundException(`Espacio con ID ${id} no encontrado`);
    }

    // Verificar permisos
    if (userRole === UserRole.PARKING_OWNER) {
      const parkingLot = await this.parkingLotRepository.findOne({
        where: { id: space.parkingLotId },
        relations: ['owner'],
      });
      if (parkingLot?.owner.userId !== userId) {
        throw new ForbiddenException('No tienes permiso para reactivar este espacio');
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción');
    }

    // ✅ Actualizar isActive
    space.isActive = isActive;

    // Si se está reactivando, cambiar el estado a AVAILABLE
    if (isActive) {
      space.status = SpaceStatus.AVAILABLE;
    }

    const updatedSpace = await this.spaceRepository.save(space);

    // Emitir evento WebSocket para actualizar en tiempo real
    this.websocketGateway.emitSpaceUpdate(space.parkingLotId, space.id, space.status);

    return updatedSpace;
  }
}