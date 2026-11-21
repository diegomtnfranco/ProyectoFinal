import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';

export const VEHICLE_REQUIRED_CODE = 'VEHICLE_REQUIRED';

/**
 * Un cliente debe tener al menos un vehículo registrado para usar las acciones
 * principales (reservar, salir por QR, pagar). Dueños, empleados y
 * administradores no se ven afectados.
 *
 * Usa solo DataSource (disponible en toda la app) para poder aplicarse en
 * cualquier módulo sin agregar dependencias. Las cuentas antiguas con
 * `default_vehicle_plate` todavía sin copiar a client_vehicles cuentan como
 * que tienen vehículo: la copia la hace ClientVehiclesService al listarlos.
 */
@Injectable()
export class ClientVehicleRequiredGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest()?.user as
      { id?: string; role?: string } | undefined;
    if (!user?.id || user.role !== UserRole.CLIENT) return true;
    if (await hasClientVehicle(this.dataSource, user.id)) return true;
    throw new ForbiddenException({
      code: VEHICLE_REQUIRED_CODE,
      message: 'Registrá al menos un vehículo en tu perfil para continuar',
    });
  }
}

export async function hasClientVehicle(
  dataSource: DataSource,
  userId: string,
): Promise<boolean> {
  const [row] = await dataSource.query(
    `SELECT EXISTS (
              SELECT 1 FROM client_vehicles v WHERE v.client_profile_id = cp.id
            )
            OR (
              length(regexp_replace(upper(coalesce(cp.default_vehicle_plate, '')), '[^A-Z0-9]', '', 'g')) >= 5
              AND NOT EXISTS (SELECT 1 FROM client_vehicle_backfills b WHERE b.client_profile_id = cp.id)
            ) AS ok
       FROM client_profiles cp
      WHERE cp.user_id = $1`,
    [userId],
  );
  return row?.ok === true;
}

/** Exige vehículo registrado para clientes (no afecta a otros roles) */
export const RequiresClientVehicle = () =>
  applyDecorators(UseGuards(ClientVehicleRequiredGuard));
