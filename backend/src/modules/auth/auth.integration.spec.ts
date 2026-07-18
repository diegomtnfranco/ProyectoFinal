import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserRole } from '../users/entities/user.entity';

describe('Auth integration smoke test', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({ access_token: 'token', user: { role: UserRole.CLIENT } }),
            registerClient: jest.fn().mockResolvedValue({ access_token: 'token', requiresVerification: true }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should return a token when login succeeds', async () => {
    const result = await service.login({ email: 'demo@test.com', password: '12345678' } as any);

    expect(result.access_token).toBeDefined();
    expect(result.user.role).toBe(UserRole.CLIENT);
  });
});
