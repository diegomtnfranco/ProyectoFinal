import { 
  Controller, Get, Post, Body, Patch, Param, Delete, Query, 
  ParseUUIDPipe, UseGuards 
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { FilterReservationsDto } from './dto/filter-reservations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReservationResponseDto } from './dto/reservation-response.dto';

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  /**
   * Crear una reserva (cliente)
   * POST /reservations
   */
  @Post()
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear una nueva reserva' ,description: 'Crea una nueva reserva para el cliente autenticado' })
  @ApiResponse({ status: 201, description: 'Reserva creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de reserva inválidos' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiBody({ type: CreateReservationDto })
  async create(@Body() createDto: CreateReservationDto, @CurrentUser('id') userId: string) {
    return this.reservationsService.create(createDto, userId);
  }

  /**
   * Listar todas las reservas (admin)
   * GET /reservations
   */
  @Get()
  @ApiOperation({ summary: 'Listar todas las reservas' ,description: 'Retorna una lista de todas las reservas (solo admin)' })
  @ApiResponse({ status: 200, description: 'Reservas obtenidas exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 400, description: 'Parámetros de consulta inválidos' }) 
  
  @Roles(UserRole.ADMIN)
  async findAll(@Query() filters: FilterReservationsDto) {
    return this.reservationsService.findAll(filters);
  }

  /**
   * Mis reservas (cliente)
   * GET /reservations/my
   */
  @Get('my')
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar mis reservas' ,description: 'Retorna una lista de mis reservas (solo cliente)' })
  @ApiResponse({ status: 200, description: 'Reservas obtenidas exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async findMyReservations(@CurrentUser('id') userId: string) {
    return this.reservationsService.findMyReservations(userId);
  }

  /**
   * Reservas de un estacionamiento (dueño/empleado)
   * GET /reservations/parking-lot/:parkingLotId
   */
  @Get('parking-lot/:parkingLotId')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar reservas por estacionamiento' ,description: 'Retorna una lista de reservas asociadas a un estacionamiento específico' })
  @ApiResponse({ status: 200, description: 'Reservas obtenidas exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Estacionamiento no encontrado' })
  async findByParkingLot(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @CurrentUser() user: any,
  ) {
    return this.reservationsService.findByParkingLot(parkingLotId, user.id, user.role);
  }

  /**
   * Confirmar reserva (dueño/empleado)
   * PATCH /reservations/:id/confirm
   */
  @Patch(':id/confirm')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Confirmar una reserva' ,description: 'Confirma una reserva específica por su ID' })
  @ApiResponse({ status: 200, description: 'Reserva confirmada exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async confirmReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.reservationsService.confirmReservation(id, user.id, user.role);
  }

  /**
   * Cancelar reserva por cliente
   * POST /reservations/:id/cancel
   */
  @Post(':id/cancel')
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancelar una reserva' ,description: 'Cancela una reserva específica por su ID' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })   
  async cancelByClient(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.reservationsService.cancelByClient(id, userId);
  }

  /**
   * Cancelar reserva por estacionamiento (dueño/empleado)
   * POST /reservations/:id/cancel-by-parking
   */
  @Post(':id/cancel-by-parking')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancelar una reserva por estacionamiento' ,description: 'Cancela una reserva específica por su ID' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async cancelByParking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.reservationsService.cancelByParking(id, user.id, user.role, reason);
  }

  /**
   * Obtener una reserva por ID
   * GET /reservations/:id
   */
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER, UserRole.CLIENT)
  @ApiOperation({ summary: 'Obtener una reserva por ID' ,description: 'Retorna la información de una reserva específica por su ID' })
  @ApiResponse({ status: 200, description: 'Reserva obtenida exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.findOne(id);
  }

  /**
   * Actualizar reserva (solo admin)
   * PATCH /reservations/:id
   */
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar una reserva' ,description: 'Actualiza la información de una reserva específica por su ID' })
  @ApiResponse({ status: 200, description: 'Reserva actualizada exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateReservationDto,
    @CurrentUser() user: any,
  ) {
    return this.reservationsService.update(id, updateDto, user.id, user.role);
  }

  /**
   * Eliminar reserva (solo admin)
   * DELETE /reservations/:id
   */
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar una reserva' ,description: 'Elimina una reserva específica por su ID' })
  @ApiResponse({ status: 200, description: 'Reserva eliminada exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.reservationsService.remove(id, user.id, user.role);
  }


@Patch(':id/change-space')
@Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
@ApiOperation({ summary: 'Cambiar espacio de una reserva' ,description: 'Cambia el espacio de una reserva específica por su ID' })
@ApiResponse({ status: 200, description: 'Espacio de reserva cambiado exitosamente' })
@ApiResponse({ status: 403, description: 'Acceso denegado' })
@ApiResponse({ status: 404, description: 'Reserva no encontrada' })
@ApiBearerAuth('JWT-auth')
async changeSpace(
  @Param('id', ParseUUIDPipe) id: string,
  @Body('newSpaceId', ParseUUIDPipe) newSpaceId: string,
  @CurrentUser() user: any,
) {
  return this.reservationsService.changeSpace(id, newSpaceId, user.id, user.role);
}
}