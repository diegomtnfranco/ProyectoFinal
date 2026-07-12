import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { ClientProfile } from '../client-profiles/entities/client-profile.entity';
import { ParkingEmployee } from '../parking-employees/entities/parking-employee.entity';
import { ParkingOwner } from '../parking-owners/entities/parking-owner.entity';
import { ParkingLot } from '../parking-lots/entities/parking-lot.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { QRService } from '../common/qr/qr.service';
import { Space } from '../spaces/entities/space.entity';
import { User, UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let clientRepository: { create: jest.Mock; save: jest.Mock };
  let parkingOwnerRepository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let parkingEmployeeRepository: { create: jest.Mock; save: jest.Mock };
  let parkingLotRepository: { create: jest.Mock; save: jest.Mock };
  let spaceRepository: { create: jest.Mock; save: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let notificationsService: {
    sendVerificationEmail: jest.Mock;
    sendWelcomeEmail: jest.Mock;
    sendPasswordResetEmail: jest.Mock;
  };
  let dataSource: { createQueryRunner: jest.Mock };
  let qrService: { generateQRForType: jest.Mock };

  beforeEach(() => {
    userRepository = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    clientRepository = { create: jest.fn(), save: jest.fn() };
    parkingOwnerRepository = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    parkingEmployeeRepository = { create: jest.fn(), save: jest.fn() };
    parkingLotRepository = { create: jest.fn(), save: jest.fn() };
    spaceRepository = { create: jest.fn(), save: jest.fn() };
    jwtService = { sign: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('7d') };
    notificationsService = {
      sendVerificationEmail: jest.fn(),
      sendWelcomeEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };
    dataSource = { createQueryRunner: jest.fn() };
    qrService = { generateQRForType: jest.fn() };

    service = new AuthService(
      userRepository as unknown as Repository<User>,
      clientRepository as unknown as Repository<ClientProfile>,
      parkingOwnerRepository as unknown as Repository<ParkingOwner>,
      parkingEmployeeRepository as unknown as Repository<ParkingEmployee>,
      parkingLotRepository as unknown as Repository<ParkingLot>,
      spaceRepository as unknown as Repository<Space>,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      notificationsService as unknown as NotificationsService,
      dataSource as unknown as DataSource,
      qrService as unknown as QRService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register a client and return a verification response', async () => {
    userRepository.findOne.mockResolvedValue(null);
    userRepository.create.mockReturnValue({ id: 'user-1', email: 'client@test.com', role: UserRole.CLIENT });
    userRepository.save.mockResolvedValue({ id: 'user-1', email: 'client@test.com', role: UserRole.CLIENT });
    clientRepository.create.mockReturnValue({ id: 'client-profile-1' });
    clientRepository.save.mockResolvedValue({ id: 'client-profile-1' });
    jwtService.sign.mockReturnValue('jwt-token');
    notificationsService.sendVerificationEmail.mockResolvedValue(undefined);

    const result = await service.registerClient({
      email: 'client@test.com',
      password: '123456',
      confirmPassword: '123456',
      name: 'Cliente Test',
      phone: '1122334455',
      defaultVehiclePlate: 'ABC123',
      defaultVehicleType: 'car',
    } as any);

    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'client@test.com' } });
    expect(userRepository.create).toHaveBeenCalled();
    expect(clientRepository.create).toHaveBeenCalled();
    expect(notificationsService.sendVerificationEmail).toHaveBeenCalled();
    expect(result.access_token).toBe('jwt-token');
    expect(result.requiresVerification).toBe(true);
  });

  it('should allow login for a verified active user', async () => {
    const hashedPassword = await bcrypt.hash('123456', 10);
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'client@test.com',
      role: UserRole.CLIENT,
      isActive: true,
      isVerified: true,
      isOauthUser: false,
      passwordHash: hashedPassword,
      clientProfile: null,
      parkingOwnerProfile: null,
      parkingEmployeeProfile: null,
    });
    jwtService.sign.mockReturnValue('jwt-token');

    const result = await service.login({ email: 'client@test.com', password: '123456' } as any);

    expect(result.access_token).toBe('jwt-token');
    expect(result.user.email).toBe('client@test.com');
  });
});
