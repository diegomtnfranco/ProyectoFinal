import { Logger } from '@nestjs/common';
import { POST_COMMIT_DELAY_MS } from '../user-notifications.constants';

const logger = new Logger('NotificationsPostCommit');

/**
 * Los eventos de TypeORM ocurren antes del commit. Se difiere el trabajo y quien
 * lo ejecuta vuelve a leer la base: si la operación se revirtió, no se notifica.
 * Cualquier error queda aislado (nunca afecta la operación de negocio).
 */
export function afterCommit(
  task: () => Promise<unknown>,
  delayMs = POST_COMMIT_DELAY_MS,
): void {
  setTimeout(() => {
    task().catch((error) =>
      logger.error('Error generando notificación', error as Error),
    );
  }, delayMs);
}
