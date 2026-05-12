import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProfile } from './entities/client-profile.entity';
import { CreateClientProfileDto } from './dto/create-client-profile.dto';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { User } from '../users/entities/user.entity'; // ← Agregar importación de User

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientProfile)
    private clientsRepository: Repository<ClientProfile>,
    @InjectRepository(User)
    private userRepository: Repository<User>, // ← Agregar
  ) {}

  async create(createClientProfileDto: CreateClientProfileDto): Promise<ClientProfile> {
    // Verificar que el usuario existe
    const user = await this.userRepository.findOne({
      where: { id: createClientProfileDto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${createClientProfileDto.userId} not found`);
    }

    // Verificar si ya tiene perfil
    const existing = await this.clientsRepository.findOne({
      where: { userId: createClientProfileDto.userId },
    });
    if (existing) {
      throw new ConflictException('User already has a client profile');
    }

    const client = this.clientsRepository.create(createClientProfileDto);
    return this.clientsRepository.save(client);
  }

  async findAll(): Promise<ClientProfile[]> {
    return this.clientsRepository.find({ relations: ['user'] });
  }

  async findOne(id: string): Promise<ClientProfile> {
    const client = await this.clientsRepository.findOne({ 
      where: { id },  // ← buscar por ID del perfil, no por userId
      relations: ['user']
    });
    if (!client) throw new NotFoundException(`Client profile with ID ${id} not found`);
    return client;
  }

  async findByUserId(userId: string): Promise<ClientProfile | null> {
    return this.clientsRepository.findOne({ 
      where: { userId },
      relations: ['user']
    });
  }

  async update(id: string, updateClientProfileDto: UpdateClientProfileDto): Promise<ClientProfile> {
    const client = await this.findOne(id);
    Object.assign(client, updateClientProfileDto);
    await this.clientsRepository.save(client);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.clientsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Client profile with ID ${id} not found`);
    }
  }
}