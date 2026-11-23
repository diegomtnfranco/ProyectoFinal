import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ParkingProfilesService } from './parking-profiles.service';
import type { ProfileRequester } from './parking-profiles.service';
import { UpdateParkingProfileDto } from './dto/update-parking-profile.dto';
import {
  CreateCustomServiceDto,
  UpdateCustomServiceDto,
} from './dto/custom-service.dto';

/**
 * JwtAuthGuard y RolesGuard son globales (APP_GUARD). Las rutas de escritura
 * exigen PARKING_OWNER y el servicio verifica además que sea dueño del lote.
 */
@ApiTags('parking-profiles')
@Controller('parking-profiles')
export class ParkingProfilesController {
  constructor(private readonly service: ParkingProfilesService) {}

  @Public()
  @Get(':parkingLotId/public')
  @ApiOperation({
    summary:
      'Información pública: descripción, características y servicios activos',
  })
  @ApiResponse({
    status: 404,
    description: 'Estacionamiento inexistente o inactivo',
  })
  getPublic(@Param('parkingLotId', ParseUUIDPipe) parkingLotId: string) {
    return this.service.getPublicProfile(parkingLotId);
  }

  @Get(':parkingLotId')
  @ApiBearerAuth()
  @Roles(UserRole.PARKING_OWNER)
  @ApiOperation({
    summary: 'Configuración completa (solo el dueño del estacionamiento)',
  })
  @ApiResponse({ status: 403, description: 'No es el dueño' })
  getAdmin(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @CurrentUser() user: ProfileRequester,
  ) {
    return this.service.getAdminProfile(parkingLotId, user);
  }

  @Put(':parkingLotId')
  @ApiBearerAuth()
  @Roles(UserRole.PARKING_OWNER)
  @ApiOperation({
    summary: 'Actualizar descripción, características y servicios predefinidos',
  })
  update(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @Body() dto: UpdateParkingProfileDto,
    @CurrentUser() user: ProfileRequester,
  ) {
    return this.service.updateProfile(parkingLotId, dto, user);
  }

  @Post(':parkingLotId/custom-services')
  @ApiBearerAuth()
  @Roles(UserRole.PARKING_OWNER)
  @ApiOperation({ summary: 'Crear servicio personalizado' })
  createCustom(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @Body() dto: CreateCustomServiceDto,
    @CurrentUser() user: ProfileRequester,
  ) {
    return this.service.createCustomService(parkingLotId, dto, user);
  }

  @Patch(':parkingLotId/custom-services/:serviceId')
  @ApiBearerAuth()
  @Roles(UserRole.PARKING_OWNER)
  @ApiOperation({ summary: 'Editar servicio personalizado' })
  updateCustom(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateCustomServiceDto,
    @CurrentUser() user: ProfileRequester,
  ) {
    return this.service.updateCustomService(parkingLotId, serviceId, dto, user);
  }

  @Delete(':parkingLotId/custom-services/:serviceId')
  @ApiBearerAuth()
  @Roles(UserRole.PARKING_OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar servicio personalizado' })
  async deleteCustom(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @CurrentUser() user: ProfileRequester,
  ): Promise<void> {
    await this.service.deleteCustomService(parkingLotId, serviceId, user);
  }
}
