import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { login: jest.Mock; registerClient: jest.Mock; getProfile: jest.Mock; verifyEmail: jest.Mock; resendVerificationEmail: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    authService = {
      login: jest.fn(),
      registerClient: jest.fn(),
      getProfile: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerificationEmail: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('http://frontend.test'),
    };

    controller = new AuthController(
      authService as unknown as AuthService,
      configService as unknown as ConfigService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate login requests to the auth service', async () => {
    const loginDto = { email: 'test@example.com', password: '123456' };
    const expectedResponse = { access_token: 'token', user: { email: 'test@example.com' } };
    authService.login.mockResolvedValue(expectedResponse);

    const response = await controller.login(loginDto as any);

    expect(authService.login).toHaveBeenCalledWith(loginDto);
    expect(response).toEqual(expectedResponse);
  });

  it('should delegate registration to the auth service', async () => {
    const registerDto = { email: 'new@example.com', password: '123456', name: 'Test' };
    const expectedResponse = { user: { email: 'new@example.com' } };
    authService.registerClient.mockResolvedValue(expectedResponse);

    const response = await controller.registerClient(registerDto as any);

    expect(authService.registerClient).toHaveBeenCalledWith(registerDto);
    expect(response).toEqual(expectedResponse);
  });

  it('should delegate profile retrieval to the auth service', async () => {
    const expectedResponse = { id: 'user-1', email: 'user@example.com' };
    authService.getProfile.mockResolvedValue(expectedResponse);

    const response = await controller.getProfile('user-1');

    expect(authService.getProfile).toHaveBeenCalledWith('user-1');
    expect(response).toEqual(expectedResponse);
  });

  it('should delegate email verification to the auth service', async () => {
    const expectedResponse = { message: 'Email verificado' };
    authService.verifyEmail.mockResolvedValue(expectedResponse);

    const response = await controller.verifyEmail({ token: 'abc' } as any);

    expect(authService.verifyEmail).toHaveBeenCalledWith('abc');
    expect(response).toEqual(expectedResponse);
  });
});
