import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SpaceResponseDto } from './dto/space-response.dto';
import { ReactivateSpaceDto } from './dto/reactivate-space.dto';

@ApiTags('spaces')
@Controller('spaces')
@UseGuards(JwtAuthGuard)
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) { }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Crear un nuevo espacio',
    description: 'Crea un nuevo espacio en un estacionamiento. Solo propietarios y administradores.'
  })
  @ApiResponse({
    status: 201,
    description: 'Espacio creado exitosamente',
    type: SpaceResponseDto
  })
  @ApiResponse({ status: 400, description: 'Datos de creación inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 409, description: 'El espacio ya existe' })
  @ApiBody({ type: CreateSpaceDto })
  create(@Body() createSpaceDto: CreateSpaceDto, @CurrentUser() user: any) {
    return this.spacesService.create(createSpaceDto, user.id, user.role);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener todos los espacios',
    description: 'Retorna una lista de todos los espacios del sistema. Solo para administradores.'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de espacios obtenida exitosamente',
    type: [SpaceResponseDto]
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  findAll() {
    return this.spacesService.findAll();
  }

  @Get('parking-lot/:parkingLotId')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'parkingLotId', type: String, description: 'UUID del estacionamiento' })
  @ApiOperation({
    summary: 'Obtener espacios de un estacionamiento',
    description: 'Retorna todos los espacios de un estacionamiento específico'
  })
  @ApiResponse({
    status: 200,
    description: 'Espacios obtenidos exitosamente',
    type: [SpaceResponseDto]
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Estacionamiento no encontrado' })
  findByParkingLot(@Param('parkingLotId', ParseUUIDPipe) parkingLotId: string, @CurrentUser() user: any) {
    return this.spacesService.findByParkingLot(parkingLotId);
  }

  @Public()
  @Get('parking-lot/:parkingLotId/available')
  @ApiParam({ name: 'parkingLotId', type: String, description: 'UUID del estacionamiento' })
  @ApiQuery({
    name: 'vehicleType',
    type: String,
    enum: ['car', 'truck', 'motorcycle', 'van'],
    required: false,
    description: 'Filtrar por tipo de vehículo permitido'
  })
  @ApiOperation({
    summary: 'Obtener espacios disponibles',
    description: 'Retorna los espacios disponibles de un estacionamiento, opcionalmente filtrados por tipo de vehículo'
  })
  @ApiResponse({
    status: 200,
    description: 'Espacios disponibles obtenidos exitosamente',
    type: [SpaceResponseDto]
  })
  @ApiResponse({ status: 404, description: 'Estacionamiento no encontrado' })
  findAvailable(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @Query('vehicleType') vehicleType?: VehicleType,
  ) {
    return this.spacesService.findAvailable(parkingLotId, vehicleType);
  }

  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', type: String, description: 'UUID del espacio' })
  @ApiOperation({
    summary: 'Obtener un espacio específico',
    description: 'Retorna los detalles de un espacio específico'
  })
  @ApiResponse({
    status: 200,
    description: 'Espacio obtenido exitosamente',
    type: SpaceResponseDto
  })
  @ApiResponse({ status: 404, description: 'Espacio no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.spacesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', type: String, description: 'UUID del espacio' })
  @ApiOperation({
    summary: 'Actualizar un espacio',
    description: 'Actualiza la información de un espacio. Empleados solo pueden cambiar el estado.'
  })
  @ApiResponse({
    status: 200,
    description: 'Espacio actualizado exitosamente',
    type: SpaceResponseDto
  })
  @ApiResponse({ status: 400, description: 'Datos de actualización inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Espacio no encontrado' })
  @ApiBody({ type: UpdateSpaceDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSpaceDto: UpdateSpaceDto,
    @CurrentUser() user: any,
  ) {
    return this.spacesService.update(id, updateSpaceDto, user.id, user.role);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', type: String, description: 'UUID del espacio' })
  @ApiOperation({
    summary: 'Actualizar estado de un espacio',
    description: 'Cambia el estado de un espacio (available, reserved, occupied, maintenance)'
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente',
    type: SpaceResponseDto
  })
  @ApiResponse({ status: 400, description: 'Estado inválido' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Espacio no encontrado' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          enum: ['available', 'reserved', 'occupied', 'maintenance'],
          example: 'occupied'
        }
      },
      required: ['status']
    }
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @CurrentUser() user: any,
  ) {
    return this.spacesService.updateStatus(id, status, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', type: String, description: 'UUID del espacio' })
  @ApiOperation({
    summary: 'Eliminar un espacio',
    description: 'Elimina un espacio del sistema. Solo propietarios y administradores.'
  })
  @ApiResponse({ status: 200, description: 'Espacio eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Espacio no encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.spacesService.remove(id, user.id, user.role);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', type: String, description: 'UUID del espacio' })
  @ApiOperation({
    summary: 'Reactivar un espacio',
    description: 'Cambia el estado isActive de un espacio a true. Solo para administradores y dueños.'
  })
  @ApiResponse({
    status: 200,
    description: 'Espacio reactivado exitosamente',
    type: SpaceResponseDto
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Espacio no encontrado' })
  @ApiBody({ type: ReactivateSpaceDto })
  async reactivateSpace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reactivateDto: ReactivateSpaceDto,
    @CurrentUser() user: any,
  ) {
    return this.spacesService.reactivateSpace(id, reactivateDto!.isActive, user.id, user.role);
  }

  @Get('parking-lot/:parkingLotId/all')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'parkingLotId', type: String, description: 'UUID del estacionamiento' })
  @ApiOperation({
    summary: 'Obtener todos los espacios de un estacionamiento (incluyendo inactivos)',
    description: 'Retorna todos los espacios de un estacionamiento, incluyendo los desactivados. Solo para administradores y dueños.'
  })
  @ApiResponse({
    status: 200,
    description: 'Espacios obtenidos exitosamente',
    type: [SpaceResponseDto]
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async findAllSpaces(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @CurrentUser() user: any,
  ) {
    return this.spacesService.findAllSpaces(parkingLotId);
  }

  
}