import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingOwner } from './entities/parking-owner.entity';
import { CreateParkingOwnerDto } from './dto/create-parking-owner.dto';
import { UpdateParkingOwnerDto } from './dto/update-parking-owner.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ParkingOwnersService {
  constructor(
    @InjectRepository(ParkingOwner)
    private parkingOwnerRepository: Repository<ParkingOwner>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createDto: CreateParkingOwnerDto): Promise<ParkingOwner> {
    // Verificar si el usuario existe
    const user = await this.userRepository.findOne({ where: { id: createDto.userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${createDto.userId} not found`);
    }

    // Verificar si el CUIT ya está registrado
    const existingCuit = await this.parkingOwnerRepository.findOne({ where: { cuit: createDto.cuit } });
    if (existingCuit) {
      throw new ConflictException(`CUIT ${createDto.cuit} already registered`);
    }

    // Verificar si ya tiene perfil de dueño
    const existing = await this.parkingOwnerRepository.findOne({ where: { userId: createDto.userId } });
    if (existing) {
      throw new ConflictException('User already has a parking owner profile');
    }

    const parkingOwner = this.parkingOwnerRepository.create(createDto);
    return this.parkingOwnerRepository.save(parkingOwner);
  }

  async findAll(): Promise<ParkingOwner[]> {
    return this.parkingOwnerRepository.find({ relations: ['user', 'parkingLots'] });
  }

  async findOne(id: string): Promise<ParkingOwner> {
    const parkingOwner = await this.parkingOwnerRepository.findOne({
      where: { id },
      relations: ['user', 'parkingLots'],
    });
    if (!parkingOwner) {
      throw new NotFoundException(`Parking owner with ID ${id} not found`);
    }
    return parkingOwner;
  }

  async findByUserId(userId: string): Promise<ParkingOwner | null> {
    return this.parkingOwnerRepository.findOne({
      where: { userId },
      relations: ['user', 'parkingLots'],
    });
  }

  async findByCuit(cuit: string): Promise<ParkingOwner | null> {
    return this.parkingOwnerRepository.findOne({ where: { cuit } });
  }

  async update(id: string, updateDto: UpdateParkingOwnerDto): Promise<ParkingOwner> {
    await this.parkingOwnerRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async approve(id: string): Promise<ParkingOwner> {
    await this.parkingOwnerRepository.update(id, {
      isApproved: true,
      approvedAt: new Date(),
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.parkingOwnerRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Parking owner with ID ${id} not found`);
    }
  }

  async getPendingApproval(): Promise<ParkingOwner[]> {
    return this.parkingOwnerRepository.find({
      where: { isApproved: false },
      relations: ['user'],
    });
  }
}