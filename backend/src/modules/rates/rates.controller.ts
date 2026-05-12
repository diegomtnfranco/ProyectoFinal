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

@Controller('rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  create(@Body() createRateDto: CreateRateDto, @CurrentUser() user: any) {
    return this.ratesService.create(createRateDto, user.id, user.role);
  }

  @Get()
  @Public()  // Público - cualquiera puede ver tarifas
  findAll() {
    return this.ratesService.findAll();
  }

  @Get('parking-lot/:parkingLotId')
  @Public()  // Público - ver tarifas de un estacionamiento
  findByParkingLot(@Param('parkingLotId', ParseUUIDPipe) parkingLotId: string) {
    return this.ratesService.findByParkingLot(parkingLotId);
  }

  @Get('vehicle-type/:vehicleType')
  @Public()
  findByVehicleType(@Param('vehicleType') vehicleType: VehicleType) {
    return this.ratesService.findByVehicleType(vehicleType);
  }

  @Get('applicable')
  @Public()
  findApplicableRate(
    @Query('parkingLotId') parkingLotId: string,
    @Query('vehicleType') vehicleType: VehicleType,
    @Query('dateTime') dateTime: string,
  ) {
    return this.ratesService.findApplicableRate(parkingLotId, vehicleType, new Date(dateTime));
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ratesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRateDto: UpdateRateDto,
    @CurrentUser() user: any,
  ) {
    return this.ratesService.update(id, updateRateDto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PARKING_OWNER)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.ratesService.remove(id, user.id, user.role);
  }

  @Delete(':id/permanent')
  @Roles(UserRole.ADMIN)
  hardRemove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.ratesService.hardRemove(id, user.id, user.role);
  }
}
