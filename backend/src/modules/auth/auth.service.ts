import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { ClientProfile, VehicleTypeEnum } from '../client-profiles/entities/client-profile.entity';
import { ParkingOwner } from '../parking-owners/entities/parking-owner.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { RegisterEmployeeDto } from './dto/register-employee.dto';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { RegisterOwnerCompleteDto } from './dto/register-owner-complete';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { Space, SpaceStatus } from '../spaces/entities/space.entity';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { QRService } from '../common/qr/qr.service';



@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ClientProfile)
    private clientRepository: Repository<ClientProfile>,
    @InjectRepository(ParkingOwner)
    private parkingOwnerRepository: Repository<ParkingOwner>,
    @InjectRepository(ParkingEmployee)
    private parkingEmployeeRepository: Repository<ParkingEmployee>,
    @InjectRepository(ParkingLot)
    private parkingLotRepository: Repository<ParkingLot>,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
    private qrService: QRService, 
  ) { }

  /**
   * Genera un token de verificación único
   */
  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  async registerClient(registerDto: RegisterClientDto) {
  // Verificar si el email ya existe
  const existingUser = await this.userRepository.findOne({
    where: { email: registerDto.email },
  });
  if (existingUser) {
    throw new ConflictException('El email ya está registrado');
  }

  // Extraer confirmPassword y no usarlo
  const { confirmPassword, ...clientData } = registerDto;

  // Generar token de verificación
  const verificationToken = this.generateVerificationToken();

  // Crear usuario
  const hashedPassword = await bcrypt.hash(clientData.password, 10);
  const user = this.userRepository.create({
    email: clientData.email,
    passwordHash: hashedPassword,
    role: UserRole.CLIENT,
    isVerified: false,
    isActive: true,
    verificationToken,
  });
  await this.userRepository.save(user);

  // Crear perfil de cliente
  const clientProfile = this.clientRepository.create({
    userId: user.id,
    name: clientData.name,
    phone: clientData.phone,
    defaultVehiclePlate: clientData.defaultVehiclePlate,
    defaultVehicleType: clientData.defaultVehicleType,
  });
  await this.clientRepository.save(clientProfile);

  // Enviar email de verificación
  await this.notificationsService.sendVerificationEmail(
    user.email,
    verificationToken,
    clientData.name,
  );

  // Crear el token JWT
  const token = this.jwtService.sign({
    sub: user.id,
    email: user.email,
    role: user.role,
  }, {
    expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    secret: this.configService.get('JWT_SECRET'),
  });

  return {
    user: this.sanitizeUser(user),
    access_token: token,
    requiresVerification: true,
    message: 'Se ha enviado un email de verificación a tu correo',
  };
}

  async registerOwner(registerDto: RegisterOwnerDto) {
    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // valido si el CUIT ya existe
    const existingCuit = await this.parkingOwnerRepository.findOne({
      where: { cuit: registerDto.cuit },
    });
    if (existingCuit) {
      throw new ConflictException('El CUIT ya está registrado');
    }

    const verificationToken = this.generateVerificationToken();

    // Crear usuario
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = this.userRepository.create({
      email: registerDto.email,
      passwordHash: hashedPassword,
      role: UserRole.PARKING_OWNER,
      isVerified: false,
      isActive: true,
      verificationToken,
    });
    await this.userRepository.save(user);

    // Crear perfil de dueño
    const parkingOwner = this.parkingOwnerRepository.create({
      userId: user.id,
      businessName: registerDto.businessName,
      cuit: registerDto.cuit,
      phone: registerDto.phone,
      address: registerDto.address,
      isApproved: false,
    });
    await this.parkingOwnerRepository.save(parkingOwner);

    // Enviar email de verificación
    await this.notificationsService.sendVerificationEmail(
      user.email,
      verificationToken,
      registerDto.businessName,
    );

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    }, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
      secret: this.configService.get('JWT_SECRET'),
    });

    return {
      user: this.sanitizeUser(user),
      access_token: token,
      requiresVerification: true,
      requiresApproval: true,
      message: 'Se ha enviado un email de verificación. Tu cuenta será revisada por un administrador.',
    };
  }

  /**
   * Registrar empleado de estacionamiento (solo PARKING_OWNER puede hacer esto)
   */
  async registerEmployee(registerDto: RegisterEmployeeDto, ownerId: string) {
    // Verificar que el estacionamiento pertenezca al dueño
    const parkingLot = await this.parkingOwnerRepository.findOne({
      where: { userId: ownerId },
      relations: ['parkingLots'],
    });

    const ownsParkingLot = parkingLot?.parkingLots?.some(lot => lot.id === registerDto.parkingLotId);
    if (!ownsParkingLot) {
      throw new UnauthorizedException('No tienes permiso para agregar empleados a este estacionamiento');
    }

    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const verificationToken = this.generateVerificationToken();
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Crear usuario empleado
    const user = this.userRepository.create({
      email: registerDto.email,
      passwordHash: hashedPassword,
      role: UserRole.PARKING_EMPLOYEE,
      isVerified: false,
      isActive: true,
      verificationToken,
    });
    await this.userRepository.save(user);

    // Crear perfil de empleado
    const employee = this.parkingEmployeeRepository.create({
      userId: user.id,
      parkingLotId: registerDto.parkingLotId,
      name: registerDto.name,
      employeeCode: registerDto.employeeCode,
      isActive: true,
    });
    await this.parkingEmployeeRepository.save(employee);

    // Enviar email de verificación
    await this.notificationsService.sendVerificationEmail(
      user.email,
      verificationToken,
      registerDto.name,
    );

    return {
      user: this.sanitizeUser(user),
      message: 'Empleado registrado exitosamente. Se ha enviado un email de verificación.',
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Token de verificación inválido o expirado');
    }

    if (user.isVerified) {
      throw new BadRequestException('El email ya fue verificado');
    }

    user.isVerified = true;
    user.verificationToken = undefined;

    await this.userRepository.save(user);

    await this.notificationsService.sendWelcomeEmail(user.email, user.email);

    return { message: 'Email verificado exitosamente' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.isVerified) {
      throw new BadRequestException('El email ya está verificado');
    }

    const newToken = this.generateVerificationToken();
    user.verificationToken = newToken;
    await this.userRepository.save(user);

    const name = user.clientProfile?.name || user.parkingOwnerProfile?.businessName || user.email;
    await this.notificationsService.sendVerificationEmail(user.email, newToken, name);

    return { message: 'Se ha reenviado el email de verificación' };
  }

  async login(loginDto: LoginDto) {

    //  if (loginDto.employeeCode) {
    //   return this.employeeLogin(loginDto);
    // }



    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['clientProfile', 'parkingOwnerProfile', 'parkingEmployeeProfile', 'parkingEmployeeProfile.parkingLot'],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Verificar si la cuenta está activa
    if (!user.isActive) {
      throw new UnauthorizedException('Tu cuenta ha sido desactivada. Contacta al administrador.');
    }

    // Verificar email (solo para clientes y dueños, empleados también requieren verificación)
    if (!user.isVerified && user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
    }

    // Verificar contraseña
    if (!user.isOauthUser) {
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash || '');
      if (!isPasswordValid) {
        throw new UnauthorizedException('Credenciales incorrectas');
      }
    }

    // Verificar si el dueño está aprobado
    if (user.role === UserRole.PARKING_OWNER && user.parkingOwnerProfile && !user.parkingOwnerProfile.isApproved) {
      throw new UnauthorizedException('Tu cuenta está pendiente de aprobación por el administrador');
    }

    // Verificar si el empleado está activo
    if (user.role === UserRole.PARKING_EMPLOYEE && user.parkingEmployeeProfile && !user.parkingEmployeeProfile.isActive) {
      throw new UnauthorizedException('Tu cuenta de empleado ha sido desactivada');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    }, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
      secret: this.configService.get('JWT_SECRET'),
    });

    return {
      user: this.sanitizeUser(user),
      access_token: token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['clientProfile', 'parkingOwnerProfile', 'parkingEmployeeProfile', 'parkingEmployeeProfile.parkingLot'],
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.sanitizeUser(user);
  }

  async validateOAuthUser(oauthData: {
    googleId?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  }) {
    // Buscar por googleId o email
    let user = await this.userRepository.findOne({
      where: [
        { googleId: oauthData.googleId },
        { email: oauthData.email },
      ],
    });

    if (!user) {
      // Crear nuevo usuario OAuth
      user = this.userRepository.create({
        email: oauthData.email,
        googleId: oauthData.googleId,
        avatarUrl: oauthData.avatarUrl,
        role: UserRole.CLIENT,
        isOauthUser: true,
      });
      await this.userRepository.save(user);

      // Crear perfil de cliente básico
      const clientProfile = this.clientRepository.create({
        userId: user.id,
        name: `${oauthData.firstName || ''} ${oauthData.lastName || ''}`.trim() || 'Usuario',
        phone: 'Pendiente',
      });
      await this.clientRepository.save(clientProfile);
    } else if (oauthData.googleId && !user.googleId) {
      // Vincular cuenta existente
      user.googleId = oauthData.googleId;
      user.avatarUrl = oauthData.avatarUrl;
      user.isOauthUser = true;
      await this.userRepository.save(user);
    }

    return user;
  }

 async getUserProfile(userId: string): Promise<any> {
  const user = await this.userRepository.findOne({
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
    userResponse.employeeProfile = {
      id: user.parkingEmployeeProfile.id,
      name: user.parkingEmployeeProfile.name,
      position: user.parkingEmployeeProfile.position,
      isActive: user.parkingEmployeeProfile.isActive,
      parkingLotId: user.parkingEmployeeProfile.parkingLotId,
      parkingLotName: user.parkingEmployeeProfile.parkingLot?.name || '',
    };
  } else {
    userResponse.employeeProfile = null;
  }

  return { user: userResponse };
}
  /**
   * Actualizar perfil unificado
   */
  async updateProfile(userId: string, updateDto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Actualizar User
      if (updateDto.user) {
        const userUpdate: any = {};
        if (updateDto.user.email) userUpdate.email = updateDto.user.email;
        if (updateDto.user.password) userUpdate.passwordHash = await bcrypt.hash(updateDto.user.password, 10);
        if (updateDto.user.avatarUrl) userUpdate.avatarUrl = updateDto.user.avatarUrl;

        if (Object.keys(userUpdate).length > 0) {
          await queryRunner.manager.update(User, userId, userUpdate);
        }
      }

      // 2. Actualizar ClientProfile
      if (updateDto.client) {
        const clientProfile = await queryRunner.manager.findOne(ClientProfile, {
          where: { userId },
        });

        if (clientProfile) {
          await queryRunner.manager.update(ClientProfile, clientProfile.id, updateDto.client);
        } else if (updateDto.client) {
          // Si no existe pero se enviaron datos, crear (caso raro)
          const newClient = queryRunner.manager.create(ClientProfile, {
            userId,
            ...updateDto.client,
            phone: updateDto.client.phone || 'pendiente',
            name: updateDto.client.name || 'Usuario',
          });
          await queryRunner.manager.save(newClient);
        }
      }

      // 3. Actualizar ParkingOwnerProfile
      if (updateDto.owner) {
        const ownerProfile = await queryRunner.manager.findOne(ParkingOwner, {
          where: { userId },
        });

        if (ownerProfile) {
          await queryRunner.manager.update(ParkingOwner, ownerProfile.id, updateDto.owner);
        }
      }

      await queryRunner.commitTransaction();

      // Retornar el perfil actualizado
      return this.getUserProfile(userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async registerOwnerComplete(registerDto: RegisterOwnerCompleteDto) {
    const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Extraer confirmPassword y no usarlo
    const { confirmPassword, ...ownerData } = registerDto;

    // 1. Verificar si el email ya existe
    const existingUser = await this.userRepository.findOne({
      where: { email: ownerData.email },
    });
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // 2. Verificar si el CUIT ya existe
    if (ownerData.cuit) {
      const existingCuit = await this.parkingOwnerRepository.findOne({
        where: { cuit: ownerData.cuit },
      });
      if (existingCuit) {
        throw new ConflictException('El CUIT ya está registrado');
      }
    }

    const verificationToken = this.generateVerificationToken();

    // 3. Crear usuario
    const hashedPassword = await bcrypt.hash(ownerData.password, 10);
    const user = this.userRepository.create({
      email: ownerData.email,
      passwordHash: hashedPassword,
      role: UserRole.PARKING_OWNER,
      isVerified: false,
      isActive: true,
      verificationToken,
    });
    await queryRunner.manager.save(user);

    // 4. Crear perfil de dueño
    const parkingOwner = this.parkingOwnerRepository.create({
      userId: user.id,
      name: ownerData.name,
      businessName: ownerData.businessName,
      cuit: ownerData.cuit,
      phone: ownerData.phone,
      address: ownerData.address,
      isApproved: false,
    });
    await queryRunner.manager.save(parkingOwner);

    // 5. Crear estacionamiento
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
      name: ownerData.parkingName || ownerData.businessName,
      address: ownerData.address || 'Dirección pendiente',
      latitude: ownerData.latitude,
      longitude: ownerData.longitude,
      openTime: ownerData.openTime,
      closeTime: ownerData.closeTime,
      checkInToken: checkInQR.token,
      checkInQrUrl: checkInQR.qrUrl,
      checkOutToken: checkOutQR.token,
      checkOutQrUrl: checkOutQR.qrUrl,
      qrUpdatedAt: new Date(),
      settings: {
        ...defaultSettings,
        allowOnlineReservations: ownerData.allowOnlineReservations ?? true,
      },
      isActive: true,
    });

    await queryRunner.manager.save(parkingLot);

    // 6. Crear espacios - VERIFICAR QUE SE CREAN CORRECTAMENTE
    const spaces: Space[] = [];
    const totalSpaces = ownerData.totalSpaces;

    console.log(`Creando ${totalSpaces} espacios para el estacionamiento ${parkingLot.name}`);

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
    console.log(`Creados ${spaces.length} espacios exitosamente`)

      // 7. Enviar email de verificación
      await this.notificationsService.sendVerificationEmail(
        user.email,
        verificationToken,
        registerDto.businessName,
      );

      await queryRunner.commitTransaction();

      // 8. Generar token JWT
      const token = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      }, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
        secret: this.configService.get('JWT_SECRET'),
      });

      return {
        user: this.sanitizeUser(user),
        access_token: token,
        parkingLot: {
          id: parkingLot.id,
          name: parkingLot.name,
          totalSpaces: spaces.length,
          spacesRange: {
            from: '001',
            to: `${totalSpaces}`.padStart(3, '0'),
          },
        },
        requiresVerification: true,
        requiresApproval: true,
        message: 'Estacionamiento creado exitosamente. Se ha enviado un email de verificación. Tu cuenta será revisada por un administrador.',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error en registerOwnerComplete:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }


  /**
 * Solicitar recuperación de contraseña
 * Genera un token y envía email de recuperación
 */
async forgotPassword(email: string): Promise<{ message: string }> {
  const user = await this.userRepository.findOne({
    where: { email },
    relations: ['clientProfile', 'parkingOwnerProfile'],
  });

  if (!user) {
    // Por seguridad, no revelamos si el email existe o no
    return { message: 'Si el email está registrado, recibirás un enlace de recuperación' };
  }

  // Generar token único
  const resetToken = randomBytes(32).toString('hex');
  
  
  // Guardar token y expiración (1 hora)
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hora
  
  await this.userRepository.save(user);

  // Obtener nombre del usuario para el email
  const name = user.clientProfile?.name || user.parkingOwnerProfile?.businessName || user.email;

  // Enviar email de recuperación
  await this.notificationsService.sendPasswordResetEmail(user.email, resetToken, name);

  this.logger.log(`Password reset requested for email: ${email}`);

  return { message: 'Si el email está registrado, recibirás un enlace de recuperación' };
}

/**
 * Restablecer contraseña con token
 */
async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const user = await this.userRepository.findOne({
    where: { resetPasswordToken: token },
  });

  if (!user) {
    throw new BadRequestException('Token inválido o expirado');
  }

  // Verificar si el token expiró
  if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
    // Limpiar token expirado
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await this.userRepository.save(user);
    throw new BadRequestException('El token ha expirado. Por favor, solicita un nuevo enlace de recuperación');
  }

  // Hashear la nueva contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Actualizar contraseña y limpiar tokens
  user.passwordHash = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await this.userRepository.save(user);

  this.logger.log(`Password reset successfully for user: ${user.email}`);

  return { message: 'Contraseña actualizada exitosamente' };
}

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, verificationToken, resetPasswordToken, ...safeUser } = user;
    return safeUser;
  }
}