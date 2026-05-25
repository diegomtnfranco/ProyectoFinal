import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseUUIDPipe, ParseFloatPipe, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ParkingLotsService } from './parking-lots.service';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { UserRole } from 'src/modules/users/entities/user.entity';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { Public } from 'src/modules/auth/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ParkingLotResponseDto, ParkingLotAvailabilityResponseDto, ParkingLotNearbyResponseDto } from './dto/parking-lot-response.dto';

@ApiTags('parking-lots')
@Controller('parking-lots')
@UseGuards(JwtAuthGuard)
export class ParkingLotsController {
  constructor(private readonly parkingLotsService: ParkingLotsService) {}

  @Post()
  @Roles(UserRole.PARKING_OWNER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Crear un nuevo estacionamiento',
    description: 'Crea un nuevo estacionamiento con la información proporcionada. Solo propietarios y administradores.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Estacionamiento creado exitosamente',
    type: ParkingLotResponseDto
  })
  @ApiResponse({ status: 400, description: 'Datos de creación inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado (solo propietarios y admins)' })
  @ApiBody({ type: CreateParkingLotDto })
  create(@Body() createParkingLotDto: CreateParkingLotDto, @CurrentUser() user: any) {
    return this.parkingLotsService.create(createParkingLotDto, user.id, user.role);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Obtener todos los estacionamientos',
    description: 'Retorna una lista de todos los estacionamientos registrados activos. Solo para administradores.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de estacionamientos obtenida exitosamente',
    type: [ParkingLotResponseDto]
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  findAll() {
    return this.parkingLotsService.findAll();
  }

  @Public()
  @Get('nearby')
  @ApiOperation({ 
    summary: 'Obtener estacionamientos cercanos',
    description: 'Retorna una lista de estacionamientos cercanos a la ubicación especificada dentro del radio indicado'
  })
  @ApiQuery({ name: 'lat', type: Number, description: 'Latitud de la ubicación', example: -34.603683 })
  @ApiQuery({ name: 'lng', type: Number, description: 'Longitud de la ubicación', example: -58.381557 })
  @ApiQuery({ name: 'radius', type: String, description: 'Radio en metros (default: 1000)', required: false, example: '1000' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de estacionamientos cercanos obtenida exitosamente',
    type: [ParkingLotNearbyResponseDto]
  })
  @ApiResponse({ status: 400, description: 'Parámetros de consulta inválidos' })
  findNearby(
    @Query('lat', new ParseFloatPipe({ exceptionFactory: () => new BadRequestException('La latitud es requerida y debe ser un número válido') })) lat: number,
    @Query('lng', new ParseFloatPipe({ exceptionFactory: () => new BadRequestException('La longitud es requerida y debe ser un número válido') })) lng: number,
    @Query('radius') radius?: string,
  ) {
    return this.parkingLotsService.findNearby(lat, lng, radius ? parseInt(radius) : 1000);
  }

  /**
   * Obtener mi estacionamiento
   * GET /parking-lots/my
   */
  @Get('my')
  @Roles(UserRole.PARKING_OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Obtener mi estacionamiento',
    description: 'Retorna el estacionamiento asociado al dueño autenticado, incluyendo espacios, tarifas y estadísticas'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estacionamiento obtenido exitosamente',
    type: ParkingLotResponseDto
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo propietarios' })
  @ApiResponse({ status: 404, description: 'Estacionamiento no encontrado' })
  async getMyParkingLot(@CurrentUser('id', ParseUUIDPipe) userId: string) {
    return this.parkingLotsService.getOwnerParkingLot(userId);
  }

  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', type: String, description: 'UUID del estacionamiento' })
  @ApiOperation({ 
    summary: 'Obtener un estacionamiento específico',
    description: 'Retorna la información completa de un estacionamiento específico por su ID'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estacionamiento obtenido exitosamente',
    type: ParkingLotResponseDto
  })
  @ApiResponse({ status: 404, description: 'Estacionamiento no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.parkingLotsService.findOne(id);
  }

  @Get('owner/:ownerId')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'ownerId', type: String, description: 'UUID del dueño' })
  @ApiOperation({ 
    summary: 'Obtener estacionamientos por dueño',
    description: 'Retorna una lista de estacionamientos asociados a un dueño específico. Los propietarios solo pueden ver sus propios estacionamientos.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estacionamientos obtenidos exitosamente',
    type: [ParkingLotResponseDto]
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Dueño o estacionamientos no encontrados' })
  findByOwner(
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
    @CurrentUser() user: any,
  ) {
    return this.parkingLotsService.findByOwner(ownerId, user.id, user.role);
  }

  @Public()
  @Get(':id/availability')
  @ApiParam({ name: 'id', type: String, description: 'UUID del estacionamiento' })
  @ApiOperation({ 
    summary: 'Obtener disponibilidad de un estacionamiento',
    description: 'Retorna estadísticas de disponibilidad incluyendo total de espacios, ocupados, disponibles y porcentaje'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Disponibilidad obtenida exitosamente',
    type: ParkingLotAvailabilityResponseDto
  })
  @ApiResponse({ status: 404, description: 'Estacionamiento no encontrado' }) 
  getAvailability(@Param('id', ParseUUIDPipe) id: string) {
    return this.parkingLotsService.getAvailability(id);
  }

  @Patch(':id')
  @Roles(UserRole.PARKING_OWNER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', type: String, description: 'UUID del estacionamiento' })
  @ApiOperation({ 
    summary: 'Actualizar un estacionamiento',
    description: 'Actualiza la información de un estacionamiento específico. Solo propietarios y administradores.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estacionamiento actualizado exitosamente',
    type: ParkingLotResponseDto
  })
  @ApiResponse({ status: 400, description: 'Datos de actualización inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Estacionamiento no encontrado' })
  @ApiBody({ type: UpdateParkingLotDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateParkingLotDto: UpdateParkingLotDto,
    @CurrentUser() user: any,
  ) {
    return this.parkingLotsService.update(id, updateParkingLotDto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.PARKING_OWNER, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', type: String, description: 'UUID del estacionamiento' })
  @ApiOperation({ 
    summary: 'Eliminar un estacionamiento',
    description: 'Elimina (desactiva) un estacionamiento específico. Solo propietarios y administradores.'
  })
  @ApiResponse({ status: 200, description: 'Estacionamiento eliminado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Estacionamiento no encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.parkingLotsService.remove(id, user.id, user.role);
  }
}