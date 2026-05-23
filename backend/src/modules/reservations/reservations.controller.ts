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
  async create(@Body() createDto: CreateReservationDto, @CurrentUser('id') userId: string) {
    return this.reservationsService.create(createDto, userId);
  }

  /**
   * Listar todas las reservas (admin)
   * GET /reservations
   */
  @Get()
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
  async findMyReservations(@CurrentUser('id') userId: string) {
    return this.reservationsService.findMyReservations(userId);
  }

  /**
   * Reservas de un estacionamiento (dueño/empleado)
   * GET /reservations/parking-lot/:parkingLotId
   */
  @Get('parking-lot/:parkingLotId')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
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
  async cancelByClient(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.reservationsService.cancelByClient(id, userId);
  }

  /**
   * Cancelar reserva por estacionamiento (dueño/empleado)
   * POST /reservations/:id/cancel-by-parking
   */
  @Post(':id/cancel-by-parking')
  @Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER, UserRole.CLIENT)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.findOne(id);
  }

  /**
   * Actualizar reserva (solo admin)
   * PATCH /reservations/:id
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.reservationsService.remove(id, user.id, user.role);
  }


@Patch(':id/change-space')
@Roles(UserRole.PARKING_OWNER, UserRole.PARKING_EMPLOYEE, UserRole.ADMIN)
async changeSpace(
  @Param('id', ParseUUIDPipe) id: string,
  @Body('newSpaceId', ParseUUIDPipe) newSpaceId: string,
  @CurrentUser() user: any,
) {
  return this.reservationsService.changeSpace(id, newSpaceId, user.id, user.role);
}
}