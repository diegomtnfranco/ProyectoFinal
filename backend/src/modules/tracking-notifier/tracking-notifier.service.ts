import { Injectable, Logger } from '@nestjs/common';
import { WebsocketGateway } from '../websocket/websocket.gateway';

/**
 * Envía eventos solo a los sockets autenticados de usuarios concretos.
 * Reutiliza la conexión y la autenticación del gateway existente
 * (client.data.user se completa en handleConnection) sin modificarlo
 * y sin usar salas globales.
 */
@Injectable()
export class TrackingNotifierService {
  private readonly logger = new Logger(TrackingNotifierService.name);

  constructor(private readonly gateway: WebsocketGateway) {}

  async emitToUsers(
    userIds: string[],
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const targets = new Set(userIds.filter(Boolean));
    const server = this.gateway?.server;
    if (!targets.size || !server) return;
    try {
      const sockets = await server.fetchSockets();
      for (const socket of sockets) {
        const userId = (socket.data as { user?: { id?: string } })?.user?.id;
        if (userId && targets.has(userId)) socket.emit(event, payload);
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo emitir ${event}: ${(error as Error).message}`,
      );
    }
  }

  /** Un payload distinto por usuario (ej. notificación propia + contador propio) con una sola consulta de sockets */
  async emitPerUser(
    event: string,
    payloads: Map<string, Record<string, unknown>>,
  ): Promise<void> {
    const server = this.gateway?.server;
    if (!payloads.size || !server) return;
    try {
      const sockets = await server.fetchSockets();
      for (const socket of sockets) {
        const userId = (socket.data as { user?: { id?: string } })?.user?.id;
        const payload = userId ? payloads.get(userId) : undefined;
        if (payload) socket.emit(event, payload);
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo emitir ${event}: ${(error as Error).message}`,
      );
    }
  }
}
