import { Injectable, NotFoundException, ConflictException, ForbiddenException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Rate } from './entities/rate.entity';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { UserRole } from '../users/entities/user.entity';
import { RateHistoryService } from '../rate-history/rate-history.service';
import { RateChangeAction } from '../rate-history/entities/rate-change-log.entity';

@Injectable()
export class RatesService {
  constructor(
    @InjectRepository(Rate)
    private rateRepository: Repository<Rate>,
    @InjectRepository(ParkingLot)
    private parkingLotRepository: Repository<ParkingLot>,
    // Opcional para no romper instancias/tests existentes que no lo pasan
    @Optional()
    private readonly rateHistory?: RateHistoryService,
  ) {}

  async create(createDto: CreateRateDto, userId: string, userRole: string): Promise<Rate> {
    // Verificar permisos

    const parkingLot = await this.parkingLotRepository.findOne({
      where: { id: createDto.parkingLotId },
      relations: ['owner'],
    });

    if (!parkingLot) {
      throw new NotFoundException(`Estacionamiento con ID ${createDto.parkingLotId} no encontrado`);
    }

    // Si es PARKING_OWNER, verificar que el parking le pertenezca
    if (userRole === UserRole.PARKING_OWNER && parkingLot.owner.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para agregar tarifas a este estacionamiento');
    }

    // Verificar que no exista una tarifa activa para este parking y tipo de vehículo
    const existingRate = await this.rateRepository.findOne({
      where: {
        parkingLotId: createDto.parkingLotId,
        vehicleType: createDto.vehicleType,
        isActive: true,
      },
    });

    if (existingRate) {
      throw new ConflictException(`Ya existe una tarifa activa para el tipo de vehículo ${createDto.vehicleType}`);
    }

    const rate = this.rateRepository.create({
      parkingLotId: createDto.parkingLotId,
      vehicleType: createDto.vehicleType,
      pricePerHour: createDto.pricePerHour,
      rateType: createDto.rateType,
      startTime: createDto.startTime,
      endTime: createDto.endTime,
    });

    const saved = await this.rateRepository.save(rate);
    await this.rateHistory?.recordChange({
      action: RateChangeAction.CREATED,
      rate: saved,
      previousPricePerHour: null,
      newPricePerHour: saved.pricePerHour,
      userId,
    });
    return saved;
  }

  async findAll(): Promise<Rate[]> {
    return this.rateRepository.find({
      relations: ['parkingLot'],
      where: { isActive: true },
    });
  }

  async findOne(id: string): Promise<Rate> {
    const rate = await this.rateRepository.findOne({
      where: { id },
      relations: ['parkingLot'],
    });
    if (!rate) {
      throw new NotFoundException(`Tarifa con ID ${id} no encontrada`);
    }
    return rate;
  }

  async findByParkingLot(parkingLotId: string, userId?: string, userRole?: string): Promise<Rate[]> {
    // Verificar permisos (opcional - si se pasa userId, verificar propiedad)
    if (userId && userRole === UserRole.PARKING_OWNER) {
      const parkingLot = await this.parkingLotRepository.findOne({
        where: { id: parkingLotId, ownerId: userId },
      });
      if (!parkingLot) {
        throw new ForbiddenException('No tienes acceso a las tarifas de este estacionamiento');
      }
    }

    return this.rateRepository.find({
      where: { parkingLotId, isActive: true },
      relations: ['parkingLot'],
    });
  }

  async findByVehicleType(vehicleType: VehicleType): Promise<Rate[]> {
    return this.rateRepository.find({
      where: { vehicleType, isActive: true },
      relations: ['parkingLot'],
    });
  }

 
async findApplicableRate(
  parkingLotId: string,
  vehicleType: VehicleType,
  dateTime: Date,
): Promise<Rate | null> {
  const hour = dateTime.getHours();
  const timeStr = `${hour.toString().padStart(2, '0')}:00`;

  // 1. Buscar tarifa con rango horario específico
  let rate = await this.rateRepository.findOne({
    where: {
      parkingLotId,
      vehicleType,
      isActive: true,
      startTime: timeStr,
    },
  });

  // 2. Si no hay tarifa con rango horario, buscar tarifa general (sin horario)
  if (!rate) {
    rate = await this.rateRepository
      .createQueryBuilder('rate')
      .where('rate.parkingLotId = :parkingLotId', { parkingLotId })
      .andWhere('rate.vehicleType = :vehicleType', { vehicleType })
      .andWhere('rate.isActive = :isActive', { isActive: true })
      .andWhere('rate.startTime IS NULL')
      .andWhere('rate.endTime IS NULL')
      .getOne();
  }

  return rate;
}



  async update(id: string, updateDto: UpdateRateDto, userId: string, userRole: string): Promise<Rate> {
    const rate = await this.findOne(id);

    // Verificar permisos
    if (userRole === UserRole.PARKING_OWNER) {
      const parkingLot = await this.parkingLotRepository.findOne({
        where: { id: rate.parkingLotId, owner: { userId: userId } },
      });
      if (!parkingLot) {
        throw new ForbiddenException('No tienes permiso para modificar esta tarifa');
      }
    }

    await this.rateRepository.update(id, updateDto);
    const updated = await this.findOne(id);

    // Desactivar por PATCH (isActive: false) cuenta como baja en el historial
    const wasDeactivated = rate.isActive && updated.isActive === false;
    await this.rateHistory?.recordChange({
      action: wasDeactivated ? RateChangeAction.DELETED : RateChangeAction.UPDATED,
      rate: updated,
      previousPricePerHour: rate.pricePerHour,
      newPricePerHour: wasDeactivated ? null : updated.pricePerHour,
      userId,
    });
    return updated;
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const rate = await this.findOne(id);

    // Verificar permisos
    if (userRole === UserRole.PARKING_OWNER) {
      // ownerId es el id de ParkingOwner, no el del usuario: se compara por owner.userId
      // (igual que en update). Antes un dueño nunca podía eliminar sus tarifas.
      const parkingLot = await this.parkingLotRepository.findOne({
        where: { id: rate.parkingLotId, owner: { userId } },
      });
      if (!parkingLot) {
        throw new ForbiddenException('No tienes permiso para eliminar esta tarifa');
      }
    }

    // Soft delete - solo desactivar
    await this.rateRepository.update(id, { isActive: false });

    if (rate.isActive) {
      await this.rateHistory?.recordChange({
        action: RateChangeAction.DELETED,
        rate,
        previousPricePerHour: rate.pricePerHour,
        newPricePerHour: null,
        userId,
      });
    }
  }

  async hardRemove(id: string, userId: string, userRole: string): Promise<void> {
    // Solo admin puede eliminar permanentemente
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo administradores pueden eliminar tarifas permanentemente');
    }

    const existing = await this.rateRepository.findOne({ where: { id } });
    const result = await this.rateRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Tarifa con ID ${id} no encontrada`);
    }

    if (existing?.isActive) {
      await this.rateHistory?.recordChange({
        action: RateChangeAction.DELETED,
        rate: existing,
        previousPricePerHour: existing.pricePerHour,
        newPricePerHour: null,
        userId,
      });
    }
  }
}