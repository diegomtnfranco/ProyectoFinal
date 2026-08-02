import { Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { ProfileResponseDto } from '../auth/dto/profile-response.dto';
import { ClientProfile } from '../client-profiles/entities/client-profile.entity';
import { ParkingOwner } from '../parking-owners/entities/parking-owner.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';
import { AdminUpdateProfileDto } from './dto/admin-update-user.dto';

interface FindAllUsersParams {
  page: number;
  limit: number;
  search?: string;
  role?: string;
}

@Injectable()
export class UsersService {
private readonly logger = new Logger('UsersService');
 

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
    ,
    private cloudinaryService: CloudinaryService,
    private dataSource: DataSource, 
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const user = this.usersRepository.create({
        ...createUserDto,
        passwordHash: hashedPassword,
      });
      await this.usersRepository.save(user);
      return user
    } catch (error: Error | any) {
      this.handleDBExceptions(error);
    }

  }

  async findAll(params: FindAllUsersParams): Promise<{
    data: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page, limit, search, role } = params;
    const skip = (page - 1) * limit;

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.clientProfile', 'clientProfile')
      .leftJoinAndSelect('user.parkingOwnerProfile', 'parkingOwnerProfile')
      .leftJoinAndSelect('user.parkingEmployeeProfile', 'parkingEmployeeProfile')
      .where('1=1');

    // Filtro por búsqueda
    if (search) {
      queryBuilder.andWhere(
        new Brackets(qb => {
          qb.where('user.email ILIKE :search')
            .orWhere('clientProfile.name ILIKE :search')
            .orWhere('parkingOwnerProfile.businessName ILIKE :search')
            .orWhere('parkingEmployeeProfile.name ILIKE :search');
        }),
        { search: `%${search}%` }
      );
    }

    // Filtro por rol
    if (role && role !== 'all') {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    // Ordenar por fecha de creación (más reciente primero)
    queryBuilder.orderBy('user.createdAt', 'DESC');

    // Paginación
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<User> {
     const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

   async AdminFindOne(id: string): Promise<Partial<User>> {
    const user = await this.usersRepository.findOne({
          where: { id: id },
          relations: ['clientProfile', 'parkingOwnerProfile', 'parkingEmployeeProfile', 'parkingEmployeeProfile.parkingLot'],
        });
    
        if (!user) {
          throw new UnauthorizedException('Usuario no encontrado');
        }
    
        return this.sanitizeUser(user);
  }

   private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, verificationToken, resetPasswordToken, ...safeUser } = user;
    return safeUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // async update(id: string, updateUserDto: UpdateProfileDto): Promise<User> {
  //   const user = await this.usersRepository.preload({id, ...updateUserDto});
    
  //   if (!user) throw new NotFoundException(`User with ID ${id} not found`);
  //   try {
  //     await this.usersRepository.save(user);
  //     return this.findOne(id);
      
  //   } catch (error) {
  //     this.handleDBExceptions(error);
  //   }
    
  // }

  async adminUpdateUser(id: string, updateDto: AdminUpdateProfileDto): Promise<ProfileResponseDto> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const currentUser = await queryRunner.manager.findOne(User, {
      where: { id: id },
      relations: ['clientProfile', 'parkingOwnerProfile', 'parkingEmployeeProfile'],
    });

    if (!currentUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // 2. Actualizar User
    if (updateDto.user) {
      const userUpdate: any = {};
      if (updateDto.user.email) userUpdate.email = updateDto.user.email;
      if (updateDto.user.password) userUpdate.passwordHash = await bcrypt.hash(updateDto.user.password, 10);
      if (updateDto.user.avatarUrl) userUpdate.avatarUrl = updateDto.user.avatarUrl;

      if (Object.keys(userUpdate).length > 0) {
        await queryRunner.manager.update(User, id, userUpdate);
      }
    }

    // ✅ Actualizar isVerified directamente en el usuario
    if (updateDto.isVerified !== undefined) {
      await queryRunner.manager.update(User, id, { isVerified: updateDto.isVerified });
    }

    // 3. Actualizar ClientProfile
    if (updateDto.client && currentUser.role === UserRole.CLIENT) {
      const clientProfile = await queryRunner.manager.findOne(ClientProfile, {
        where: { userId: id },
      });

      if (clientProfile) {
        await queryRunner.manager.update(ClientProfile, clientProfile.id, updateDto.client);
      }
    }

    // 4. Actualizar ParkingOwnerProfile
    if (updateDto.owner && currentUser.role === UserRole.PARKING_OWNER) {
      const ownerProfile = await queryRunner.manager.findOne(ParkingOwner, {
        where: { userId: id },
      });

      if (ownerProfile) {
        await queryRunner.manager.update(ParkingOwner, ownerProfile.id, updateDto.owner);
      }
    }

    // 5. Actualizar ParkingEmployeeProfile
    if (updateDto.employee && currentUser.role === UserRole.PARKING_EMPLOYEE) {
      const employeeProfile = await queryRunner.manager.findOne(ParkingEmployee, {
        where: { userId: id },
      });

      if (employeeProfile) {
        await queryRunner.manager.update(ParkingEmployee, employeeProfile.id, updateDto.employee);
      }
    }

    await queryRunner.commitTransaction();

    return this.getUserProfile(id);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

  async remove(id: string): Promise<void> {
    const userToDelete = await this.findOne(id);
    if (!userToDelete) throw new NotFoundException(`User with ID ${id} not found`);
    await this.usersRepository.remove(userToDelete);
  }

  private handleDBExceptions(error: Error | any): never {
    this.logger.error('Database error', error);
    throw new InternalServerErrorException('Database error: ' + error.message);
  }

  async activateUser(id: string) {
  const user = await this.usersRepository.findOne({
    where: { id },
  })

  if (!user) {
    throw new NotFoundException(
      'Usuario no encontrado'
    )
  }

  user.isActive = true

  return await this.usersRepository.save(user)
}
async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
  const user = await this.usersRepository.findOne({ where: { id: userId } });
  
  if (!user) {
    throw new NotFoundException('Usuario no encontrado');
  }
  
  // Opcional: Si existía avatar anterior, eliminarlo de Cloudinary
  if (user.avatarUrl) {
    const publicId = this.extractPublicIdFromUrl(user.avatarUrl);
    if (publicId) {
      await this.cloudinaryService.deleteImage(publicId).catch(err => console.error('Error deleting old avatar:', err));
    }
  }
  
  user.avatarUrl = avatarUrl;
  return this.usersRepository.save(user);
}

private extractPublicIdFromUrl(url: string): string | null {
  // Extraer public_id de la URL de Cloudinary
  // Ejemplo: https://res.cloudinary.com/.../upload/v123456/avatars/abc123.jpg
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.\w+$/);
  return match ? match[1] : null;
}

async deactivateUser(id: string) {
  const user = await this.usersRepository.findOne({
    where: { id },
  })

  if (!user) {
    throw new NotFoundException(
      'Usuario no encontrado'
    )
  }

  console.log('Deactivating user:', user.id, 'Current isActive status:', user.isActive);
  user.isActive = false

  return await this.usersRepository.save(user)
}


async getUserProfile(userId: string): Promise<any> {
  const user = await this.usersRepository.findOne({
    where: { id: userId },
    relations: ['clientProfile', 'parkingOwnerProfile', 'parkingEmployeeProfile', 'parkingEmployeeProfile.parkingLot'],
  });

  if (!user) {
    throw new UnauthorizedException('Usuario no encontrado');
  }

  // Construir el objeto usuario con todas las propiedades
  const userResponse: any = {
    id: user.id,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };

  // Siempre incluir clientProfile (puede ser null)
  if (user.clientProfile) {
    userResponse.clientProfile = {
      id: user.clientProfile.id,
      name: user.clientProfile.name,
      phone: user.clientProfile.phone || '',
      defaultVehiclePlate: user.clientProfile.defaultVehiclePlate,
      defaultVehicleType: user.clientProfile.defaultVehicleType,
    };
  } else {
    userResponse.clientProfile = null;
  }

  // Siempre incluir parkingOwnerProfile (puede ser null)
  if (user.parkingOwnerProfile) {
    userResponse.parkingOwnerProfile = {
      id: user.parkingOwnerProfile.id,
      name:user.parkingOwnerProfile.name,
      businessName: user.parkingOwnerProfile.businessName,
      cuit: user.parkingOwnerProfile.cuit,
      phone: user.parkingOwnerProfile.phone,
      address: user.parkingOwnerProfile.address,
      isApproved: user.parkingOwnerProfile.isApproved,
    };
  } else {
    userResponse.parkingOwnerProfile = null;
  }

  // Siempre incluir employeeProfile (puede ser null)
  if (user.parkingEmployeeProfile) {
    userResponse.parkingEmployeeProfile = {
      id: user.parkingEmployeeProfile.id,
      name: user.parkingEmployeeProfile.name,
      position: user.parkingEmployeeProfile.position,
      isActive: user.parkingEmployeeProfile.isActive,
      parkingLotId: user.parkingEmployeeProfile.parkingLotId,
      parkingLotName: user.parkingEmployeeProfile.parkingLot?.name || '',
    };
  } else {
    userResponse.parkingEmployeeProfile = null;
  }

  return { user: userResponse };
}
}
