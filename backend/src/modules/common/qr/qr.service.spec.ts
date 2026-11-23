import { QRService } from './qr.service';

describe('QRService', () => {
  let service: QRService;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = { get: jest.fn().mockReturnValue('https://frontend.test') };
    service = new QRService(configService as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build a QR URL from the configured frontend URL', () => {
    const url = service.getQRUrl('token-1', 'check-in');

    expect(configService.get).toHaveBeenCalledWith('FRONTEND_URL');
    expect(url).toContain('token-1');
  });

  it('should not produce a double slash when FRONTEND_URL ends with /', () => {
    configService.get.mockReturnValue('https://frontend.test/ ');
    expect(service.getQRUrl('abc', 'check-in')).toBe('https://frontend.test/scan/check-in?token=abc');
  });
});
