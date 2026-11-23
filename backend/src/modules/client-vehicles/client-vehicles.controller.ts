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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ClientVehiclesService } from './client-vehicles.service';
import {
  CreateClientVehicleDto,
  UpdateClientVehicleDto,
} from './dto/client-vehicle.dto';

/** Vehículos del cliente autenticado (siempre "me": nunca se acepta un id de cliente) */
@ApiTags('client-vehicles')
@ApiBearerAuth()
@Controller('client-vehicles/me')
@Roles(UserRole.CLIENT)
export class ClientVehiclesController {
  constructor(private readonly service: ClientVehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Mis vehículos (máximo 3)' })
  list(@CurrentUser('id') userId: string) {
    return this.service.listMine(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un vehículo' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateClientVehicleDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Patch(':vehicleId')
  @ApiOperation({ summary: 'Editar un vehículo propio' })
  update(
    @CurrentUser('id') userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: UpdateClientVehicleDto,
  ) {
    return this.service.update(userId, vehicleId, dto);
  }

  @Delete(':vehicleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un vehículo propio' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ): Promise<void> {
    await this.service.remove(userId, vehicleId);
  }
}
