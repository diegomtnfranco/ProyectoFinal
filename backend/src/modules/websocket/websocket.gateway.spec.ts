import { WebsocketGateway } from './websocket.gateway';

describe('WebsocketGateway', () => {
  let gateway: WebsocketGateway;
  let userRepository: { findOne: jest.Mock };
  let parkingLotRepository: { find: jest.Mock };
  let spaceRepository: { find: jest.Mock };
  let jwtService: { verify: jest.Mock };
  let configService: { get: jest.Mock };
  let server: { to: jest.Mock; emit: jest.Mock };

  beforeEach(() => {
    userRepository = { findOne: jest.fn() };
    parkingLotRepository = { find: jest.fn() };
    spaceRepository = { find: jest.fn() };
    jwtService = { verify: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('secret') };
    server = { to: jest.fn().mockReturnThis(), emit: jest.fn() };

    gateway = new WebsocketGateway(
      userRepository as any,
      parkingLotRepository as any,
      spaceRepository as any,
      jwtService as any,
      configService as any,
    );
    (gateway as any).server = server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should emit occupancy update to the correct room', () => {
    gateway.emitOccupancyUpdate('parking-1', { spaceId: 'space-1', spaceNumber: '001', action: 'check-in' });

    expect(server.to).toHaveBeenCalledWith('parking:parking-1');
    expect(server.emit).toHaveBeenCalled();
  });

  it('should emit space update to clients and owners rooms', () => {
    gateway.emitSpaceUpdate('parking-1', 'space-1', 'occupied');

    expect(server.to).toHaveBeenCalled();
  });
});
