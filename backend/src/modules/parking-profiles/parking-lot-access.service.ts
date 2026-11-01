import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';
import { UserRole } from '../users/entities/user.entity';

export interface AccessRequester {
  id: string;
  role: string;
}

/**
 * Verificaciones de pertenencia al estacionamiento para las funcionalidades
 * nuevas. No reemplaza ni modifica guards existentes.
 */
@Injectable()
export class ParkingLotAccessService {
  constructor(
    @InjectRepository(ParkingLot)
    private readonly parkingLotRepository: Repository<ParkingLot>,
    @InjectRepository(ParkingEmployee)
    private readonly employeeRepository: Repository<ParkingEmployee>,
  ) {}

  /** Solo el dueño del estacionamiento */
  async assertOwner(
    parkingLotId: string,
    user: AccessRequester,
  ): Promise<ParkingLot> {
    if (!user || (user.role as UserRole) !== UserRole.PARKING_OWNER) {
      throw new ForbiddenException(
        'Solo el dueño puede modificar esta configuración',
      );
    }
    const lot = await this.findLot(parkingLotId);
    if (!lot.owner || lot.owner.userId !== user.id) {
      throw new ForbiddenException(
        'No tenés permiso sobre este estacionamiento',
      );
    }
    return lot;
  }

  /** Dueño del estacionamiento o empleado activo asignado a él */
  async assertStaff(
    parkingLotId: string,
    user: AccessRequester,
  ): Promise<ParkingLot> {
    const role = user?.role as UserRole;
    if (role === UserRole.PARKING_OWNER)
      return this.assertOwner(parkingLotId, user);
    if (role === UserRole.PARKING_EMPLOYEE) {
      const lot = await this.findLot(parkingLotId);
      const employee = await this.employeeRepository.findOne({
        where: { userId: user.id, parkingLotId, isActive: true },
        select: { id: true },
      });
      if (!employee)
        throw new ForbiddenException(
          'No estás asignado a este estacionamiento',
        );
      return lot;
    }
    throw new ForbiddenException('No tenés permiso para esta acción');
  }

  private async findLot(parkingLotId: string): Promise<ParkingLot> {
    const lot = await this.parkingLotRepository.findOne({
      where: { id: parkingLotId },
      relations: { owner: true },
    });
    if (!lot) throw new NotFoundException('Estacionamiento no encontrado');
    return lot;
  }
}
