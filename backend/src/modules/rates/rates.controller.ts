import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, UseGuards, Query } from '@nestjs/common';
import { RatesService } from './rates.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RateResponseDto, ApplicableRateResponseDto } from './dto/rate-response.dto';

@ApiTags('rates')
@Controller('rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Crear una nueva tarifa',
    description: 'Crea una nueva tarifa para un estacionamiento. Solo propietarios y administradores.'
  })
  @ApiResponse({
    status: 201,
    description: 'Tarifa creada exitosamente',
    type: RateResponseDto
  })
  @ApiResponse({ status: 400, description: 'Datos de creación inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiBody({ type: CreateRateDto })
  create(@Body() createRateDto: CreateRateDto, @CurrentUser() user: any) {
    return this.ratesService.create(createRateDto, user.id, user.role);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Obtener todas las tarifas',
    description: 'Retorna una lista de todas las tarifas activas del sistema'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tarifas obtenida exitosamente',
    type: [RateResponseDto]
  })
  findAll() {
    return this.ratesService.findAll();
  }

  @Get('parking-lot/:parkingLotId')
  @Public()
  @ApiParam({ name: 'parkingLotId', type: String, description: 'UUID del estacionamiento' })
  @ApiOperation({
    summary: 'Obtener tarifas de un estacionamiento',
    description: 'Retorna todas las tarifas asociadas a un estacionamiento específico'
  })
  @ApiResponse({
    status: 200,
    description: 'Tarifas obtenidas exitosamente',
    type: [RateResponseDto]
  })
  @ApiResponse({ status: 404, description: 'Estacionamiento no encontrado' })
  findByParkingLot(@Param('parkingLotId', ParseUUIDPipe) parkingLotId: string) {
    return this.ratesService.findByParkingLot(parkingLotId);
  }

  @Get('vehicle-type/:vehicleType')
  @Public()
  @ApiParam({
    name: 'vehicleType',
    type: String,
    enum: ['car', 'truck', 'motorcycle', 'van'],
    description: 'Tipo de vehículo'
  })
  @ApiOperation({
    summary: 'Obtener tarifas por tipo de vehículo',
    description: 'Retorna todas las tarifas aplicables a un tipo de vehículo específico'
  })
  @ApiResponse({
    status: 200,
    description: 'Tarifas obtenidas exitosamente',
    type: [RateResponseDto]
  })
  findByVehicleType(@Param('vehicleType') vehicleType: VehicleType) {
    return this.ratesService.findByVehicleType(vehicleType);
  }

  @Get('applicable')
  @Public()
  @ApiQuery({ name: 'parkingLotId', type: String, description: 'UUID del estacionamiento', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiQuery({ name: 'vehicleType', type: String, enum: ['car', 'truck', 'motorcycle', 'van'], description: 'Tipo de vehículo', example: 'car' })
  @ApiQuery({ name: 'dateTime', type: String, description: 'Fecha y hora (ISO 8601)', example: '2024-01-15T14:30:00Z' })
  @ApiOperation({
    summary: 'Obtener tarifa aplicable',
    description: 'Obtiene la tarifa aplicable para una combinación específica de estacionamiento, tipo de vehículo y momento'
  })
  @ApiResponse({
    status: 200,
    description: 'Tarifa aplicable obtenida',
    type: ApplicableRateResponseDto
  })
  @ApiResponse({ status: 404, description: 'No hay tarifa disponible' })
  findApplicableRate(
    @Query('parkingLotId') parkingLotId: string,
    @Query('vehicleType') vehicleType: VehicleType,
    @Query('dateTime') dateTime: string,
  ) {
    return this.ratesService.findApplicableRate(parkingLotId, vehicleType, new Date(dateTime));
  }

  @Get(':id')
  @Public()
  @ApiParam({ name: 'id', type: String, description: 'UUID de la tarifa' })
  @ApiOperation({
    summary: 'Obtener una tarifa específica',
    description: 'Retorna los detalles de una tarifa específica'
  })
  @ApiResponse({
    status: 200,
    description: 'Tarifa obtenida exitosamente',
    type: RateResponseDto
  })
  @ApiResponse({ status: 404, description: 'Tarifa no encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ratesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', type: String, description: 'UUID de la tarifa' })
  @ApiOperation({
    summary: 'Actualizar una tarifa',
    description: 'Actualiza la información de una tarifa. Solo propietarios y administradores.'
  })
  @ApiResponse({
    status: 200,
    description: 'Tarifa actualizada exitosamente',
    type: RateResponseDto
  })
  @ApiResponse({ status: 400, description: 'Datos de actualización inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Tarifa no encontrada' })
  @ApiBody({ type: UpdateRateDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRateDto: UpdateRateDto,
    @CurrentUser() user: any,
  ) {
    return this.ratesService.update(id, updateRateDto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', type: String, description: 'UUID de la tarifa' })
  @ApiOperation({
    summary: 'Eliminar una tarifa',
    description: 'Marca una tarifa como inactiva. Solo propietarios y administradores.'
  })
  @ApiResponse({ status: 200, description: 'Tarifa eliminada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Tarifa no encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.ratesService.remove(id, user.id, user.role);
  }

  @Delete(':id/permanent')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', type: String, description: 'UUID de la tarifa' })
  @ApiOperation({
    summary: 'Eliminar una tarifa permanentemente',
    description: 'Elimina permanentemente una tarifa de la base de datos. Solo administradores.'
  })
  @ApiResponse({ status: 200, description: 'Tarifa eliminada permanentemente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  @ApiResponse({ status: 404, description: 'Tarifa no encontrada' })
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.ratesService.hardRemove(id, user.id, user.role);
  }
}
