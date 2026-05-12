import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';

// Decorador para asignar roles a rutas o controladores
//  Por ejemplo: @Roles('admin', 'user') en un endpoint o controlador
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);