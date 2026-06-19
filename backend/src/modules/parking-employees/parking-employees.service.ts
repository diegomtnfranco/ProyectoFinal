import { Injectable, NotFoundException, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ParkingEmployee } from './entities/parking-employee.entity';
import { CreateEmployeeDto } from './dto/create-parking-employee.dto';
import { UpdateEmployeeDto } from './dto/update-parking-employee.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { Space, SpaceStatus } from '../spaces/entities/space.entity';
import { EmployeeParkingLotResponseDto, EmployeeSpaceDto } from './dto/employee-parking-lot-response.dto';

@Injectable()
export class ParkingEmployeesService {
  constructor(
    @InjectRepository(ParkingEmployee)
    private employeeRepository: Repository<ParkingEmployee>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ParkingLot)
    private parkingLotRepository: Repository<ParkingLot>,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
  ) {}

  async create(createDto: CreateEmployeeDto, ownerId: string): Promise<ParkingEmployee> {
    // Verificar que el estacionamiento pertenezca al dueño (usando ownerId, no owner_id)
    const parkingLot = await this.parkingLotRepository.findOne({
      where: { id: createDto.parkingLotId, ownerId: ownerId }, // ← ownerId
    });

    if (!parkingLot) {
      throw new UnauthorizedException('No tienes permiso para agregar empleados a este estacionamiento');
    }

    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findOne({
      where: { email: createDto.email },
    });
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Crear usuario
    const hashedPassword = await bcrypt.hash(createDto.password, 10);
    const user = this.userRepository.create({
      email: createDto.email,
      passwordHash: hashedPassword,
      role: UserRole.PARKING_EMPLOYEE,
      isVerified: true,
      isActive: true,
    });
    await this.userRepository.save(user);

    // Generar código de empleado si no viene
    const employeeCode = createDto.employeeCode || await this.generateEmployeeCode(createDto.parkingLotId);

    // Crear perfil de empleado
    const employee = this.employeeRepository.create({
      userId: user.id,
      parkingLotId: createDto.parkingLotId,
      name: createDto.name,
      employeeCode,
      position: createDto.position,
      isActive: true,
    });
    await this.employeeRepository.save(employee);

    return employee;
  }

  /**
   * Generar código único de empleado
   */
  private async generateEmployeeCode(parkingLotId: string): Promise<string> {
    const parkingLot = await this.parkingLotRepository.findOne({
      where: { id: parkingLotId },
    });

    const prefix = parkingLot?.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 4) || 'EMP';

    const count = await this.employeeRepository.count({
      where: { parkingLotId },
    });

    const number = (count + 1).toString().padStart(3, '0');
    return `${prefix}-${number}`;
  }

  async findByParkingLot(parkingLotId: string, ownerId: string): Promise<ParkingEmployee[]> {
    // Verificar que el estacionamiento pertenezca al dueño
    const parkingLot = await this.parkingLotRepository.findOne({
      where: { id: parkingLotId, ownerId: ownerId }, // ← ownerId
    });

    if (!parkingLot) {
      throw new UnauthorizedException('No tienes acceso a este estacionamiento');
    }

    return this.employeeRepository.find({
      where: { parkingLotId, isActive: true },
      relations: ['user'],
    });
  }

  async findOne(id: string): Promise<ParkingEmployee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['user', 'parkingLot'],
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return employee;
  }

  async findByUserId(userId: string): Promise<ParkingEmployee> {
    const employee = await this.employeeRepository.findOne({
      where: { userId },
      relations: ['user', 'parkingLot'],
    });

    if (!employee) {
      throw new NotFoundException('Perfil de empleado no encontrado');
    }

    return employee;
  }

  async findByEmployeeCode(employeeCode: string): Promise<ParkingEmployee | null> {
    return this.employeeRepository.findOne({
      where: { employeeCode },
      relations: ['user', 'parkingLot'],
    });
  }

  async getMyParkingLot(userId: string): Promise<EmployeeParkingLotResponseDto> {
    // 1. Buscar el perfil del empleado
    const employee = await this.employeeRepository.findOne({
      where: { userId, isActive: true },
      relations: ['parkingLot'],
    });

    if (!employee) {
      throw new NotFoundException('No tienes un perfil de empleado activo');
    }

    if (!employee.parkingLot) {
      throw new NotFoundException('No estás asignado a ningún estacionamiento');
    }

    const parkingLot = employee.parkingLot;

    // 2. Obtener todos los espacios de este estacionamiento
    const spaces = await this.spaceRepository.find({
      where: { parkingLotId: parkingLot.id, isActive: true },
    });

    // 3. Calcular estadísticas
    const totalSpaces = spaces.length;
    const availableSpaces = spaces.filter(s => s.status === SpaceStatus.AVAILABLE).length;
    const occupiedSpaces = spaces.filter(s => s.status === SpaceStatus.OCCUPIED).length;
    const reservedSpaces = spaces.filter(s => s.status === SpaceStatus.RESERVED).length;
    const maintenanceSpaces = spaces.filter(s => s.status === SpaceStatus.MAINTENANCE).length;

    // 4. Mapear espacios (solo lo que el empleado necesita ver)
    const spacesDto: EmployeeSpaceDto[] = spaces.map(space => ({
      id: space.id,
      spaceNumber: space.spaceNumber,
      status: space.status,
      allowedVehicleTypes: space.allowedVehicleTypes,
      isReserved: space.isReserved,
      reservedUntil: space.reservedUntil,
      occupiedSince: space.occupiedSince,
      occupiedByVehiclePlate: space.occupiedByVehiclePlate,
      metadata: {
        floor: space.metadata?.floor,
        zone: space.metadata?.zone,
        widthMeters: space.metadata?.widthMeters,
        lengthMeters: space.metadata?.lengthMeters,
        hasEvCharger: space.metadata?.hasEvCharger,
        isCovered: space.metadata?.isCovered,
      },
    }));

    return {
      id: parkingLot.id,
      name: parkingLot.name,
      address: parkingLot.address,
      latitude: parkingLot.latitude,
      longitude: parkingLot.longitude,
      openTime: parkingLot.openTime,
      closeTime: parkingLot.closeTime,
      stats: {
        totalSpaces,
        availableSpaces,
        occupiedSpaces,
        reservedSpaces,
        maintenanceSpaces,
      },
      spaces: spacesDto,
    };
  }

  async update(id: string, updateDto: UpdateEmployeeDto, ownerId: string): Promise<ParkingEmployee> {
    const employee = await this.findOne(id);

    // Verificar que el dueño tenga acceso
    if (employee.parkingLot.ownerId !== ownerId) { // ← ownerId
      throw new UnauthorizedException('No tienes permiso para modificar este empleado');
    }

    if (updateDto.name) {
      employee.name = updateDto.name;
    }
    if (updateDto.position !== undefined) {
      employee.position = updateDto.position;
    }
    if (updateDto.isActive !== undefined) {
      employee.isActive = updateDto.isActive;
      employee.user.isActive = updateDto.isActive;
      await this.userRepository.save(employee.user);
    }
    if (updateDto.employeeCode) {
      employee.employeeCode = updateDto.employeeCode;
    }

    await this.employeeRepository.save(employee);
    return this.findOne(id);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const employee = await this.findOne(id);

    if (employee.parkingLot.ownerId !== ownerId) { // ← ownerId
      throw new UnauthorizedException('No tienes permiso');
    }

    employee.isActive = false;
    employee.user.isActive = false;
    
    await this.userRepository.save(employee.user);
    await this.employeeRepository.save(employee);
  }

  async clockIn(userId: string): Promise<{ message: string; clockTime: Date }> {
    const employee = await this.findByUserId(userId);
    
    if (!employee.isActive) {
      throw new BadRequestException('El empleado no está activo');
    }

    const clockTime = new Date();

    // TODO: Implementar registro en tabla de time_records
    // await this.timeRecordRepository.create({ employeeId: employee.id, clockIn: clockTime });

    return { message: 'Entrada registrada exitosamente', clockTime };
  }

  async clockOut(userId: string): Promise<{ message: string; clockTime: Date }> {
    const employee = await this.findByUserId(userId);
    
    if (!employee.isActive) {
      throw new BadRequestException('El empleado no está activo');
    }

    const clockTime = new Date();

    // TODO: Implementar registro en tabla de time_records
    // await this.timeRecordRepository.update({ employeeId: employee.id, clockOut: clockTime });

    return { message: 'Salida registrada exitosamente', clockTime };
  }
}