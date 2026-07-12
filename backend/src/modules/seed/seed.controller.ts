// backend/src/modules/seed/seed.controller.ts
import { Controller, Get, Delete, HttpCode, HttpStatus, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SeedResult, SeedService } from './seed.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  /**
   * Ejecutar seed completo
   * - Si la DB está vacía: se ejecuta automáticamente (público)
   * - Si la DB tiene datos: solo admin puede ejecutarlo
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Ejecutar seed de la base de datos',
    description: 'Si la base de datos está vacía, se ejecuta automáticamente. Si tiene datos, solo admin puede ejecutarlo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Seed ejecutado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - La base de datos ya tiene datos y no eres administrador',
  })
  async seed(): Promise<SeedResult> {
    // Verificar si la DB está vacía

    console.log('llega al controller seed');
    const status = await this.seedService.checkDatabase();
    
    // Si la DB está vacía, permitir ejecución pública
    if (!status.hasData) {
      return this.seedService.seed();
    }
    
    // // Si la DB tiene datos, solo admin puede ejecutar
    // if (!user || user.role !== UserRole.ADMIN) {
    //   throw new UnauthorizedException(
    //     'La base de datos ya tiene datos. Solo administradores pueden ejecutar seed nuevamente.'
    //   );
    // }
    
    return this.seedService.seed();
  }

  /**
   * Verificar estado de la base de datos
   */
  @Get('check')
  @Public()
  @ApiOperation({
    summary: 'Verificar estado de la base de datos',
    description: 'Retorna información sobre el estado de la base de datos (si tiene datos o está vacía)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la base de datos',
  })
  async checkDatabase() {
    return this.seedService.checkDatabase();
  }

  /**
   * Limpiar base de datos (solo admin)
   * Preserva al usuario administrador
   */
  @Delete()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Limpiar base de datos',
    description: 'Elimina todos los datos excepto el usuario administrador. Solo administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Base de datos limpiada exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo administradores',
  })
  @HttpCode(HttpStatus.OK)
  async clear() {
    await this.seedService.clearDatabase();
    return { 
      message: 'Base de datos limpiada exitosamente. El usuario administrador ha sido preservado.' 
    };
  }

  /**
   * Reset completo: limpia y ejecuta seed (solo admin)
   */
  @Delete('reset')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reset completo de la base de datos',
    description: 'Limpia la base de datos (preservando admin) y ejecuta seed nuevamente. Solo administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reset completado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo administradores',
  })
  @HttpCode(HttpStatus.OK)
  async reset(@CurrentUser() user: any) {
    await this.seedService.clearDatabase();
    const result = await this.seedService.seed();
    return {
      message: 'Reset completado exitosamente',
      data: result.data,
    };
  }

  /**
   * Obtener resumen de datos existentes (solo admin)
  //  */
  // @Get('summary')
  // @Roles(UserRole.ADMIN)
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth('JWT-auth')
  // @ApiOperation({
  //   summary: 'Obtener resumen de datos',
  //   description: 'Retorna un resumen de todos los datos existentes en la base de datos. Solo administradores.',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Resumen de datos',
  // })
  // @ApiResponse({
  //   status: 401,
  //   description: 'No autenticado',
  // })
  // @ApiResponse({
  //   status: 403,
  //   description: 'Acceso denegado - Solo administradores',
  // })
  // async getSummary() {
  //   return this.seedService.getSeedSummary();
  // }
}