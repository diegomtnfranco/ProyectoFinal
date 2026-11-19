import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';

export interface Requester {
  id: string;
  role: string;
}

/**
 * Mismo criterio que ActivityService.assertCanAccess, pero sin acceso de ADMIN:
 * esta feature no agrega permisos para el administrador.
 */
@Injectable()
export class ParkingAccessService {
  constructor(private readonly dataSource: DataSource) {}

  async assertStaff(parkingLotId: string, user: Requester): Promise<void> {
    if (user.role === UserRole.PARKING_OWNER && (await this.isOwner(parkingLotId, user.id))) return;
    if (user.role === UserRole.PARKING_EMPLOYEE) {
      const rows = await this.dataSource.query(
        `SELECT 1 FROM parking_employees WHERE user_id = $1 AND parking_lot_id = $2 AND is_active = true LIMIT 1`,
        [user.id, parkingLotId],
      );
      if (rows.length) return;
    }
    throw new ForbiddenException('No tenés acceso a los pagos de este estacionamiento');
  }

  async isOwner(parkingLotId: string, userId: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1 FROM parking_lots pl JOIN parking_owners po ON po.id = pl.owner_id
        WHERE pl.id = $1 AND po.user_id = $2 LIMIT 1`,
      [parkingLotId, userId],
    );
    return rows.length > 0;
  }

  async ownerLots(userId: string): Promise<{ id: string; name: string }[]> {
    return this.dataSource.query(
      `SELECT pl.id, pl.name FROM parking_lots pl JOIN parking_owners po ON po.id = pl.owner_id
        WHERE po.user_id = $1 ORDER BY pl.name`,
      [userId],
    );
  }
}
