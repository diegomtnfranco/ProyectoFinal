import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ParkingEmployeesService } from './parking-employees.service';
import { CreateEmployeeDto } from './dto/create-parking-employee.dto';
import { UpdateEmployeeDto } from './dto/update-parking-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('parking-employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParkingEmployeesController {
  constructor(private readonly employeesService: ParkingEmployeesService) {}

  @Post()
  @Roles(UserRole.PARKING_OWNER)
  create(@Body() createDto: CreateEmployeeDto, @CurrentUser('id') ownerId: string) {
    return this.employeesService.create(createDto, ownerId);
  }

  @Get('parking-lot/:parkingLotId')
@Roles(UserRole.PARKING_OWNER)
async findByParkingLot(
  @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
  @CurrentUser('id') userId: string,  // ← Recibe userId del token
) {
  
  const employees = await this.employeesService.findByParkingLot(parkingLotId, userId);
  
  return employees.map(emp => ({
    id: emp.id,
    userId: emp.userId,
    parkingLotId: emp.parkingLotId,
    name: emp.name,
    employeeCode: emp.employeeCode,
    position: emp.position,
    isActive: emp.isActive,
    createdAt: emp.createdAt,
    user: emp.user ? {
      id: emp.user.id,
      email: emp.user.email,
      isActive: emp.user.isActive,
    } : null,
  }));
}

  @Get('me')
  @Roles(UserRole.PARKING_EMPLOYEE)
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.employeesService.findByUserId(userId);
  }


  
  /**
   * Obtener el estacionamiento donde trabaja el empleado
   * GET /employee/my-parking-lot
   */
  @Get('my-parking-lot')
  async getMyParkingLot(@CurrentUser('id') userId: string) {
    return this.employeesService.getMyParkingLot(userId);
  }

  @Get(':id')
  @Roles(UserRole.PARKING_OWNER, UserRole.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.findOne(id);
  }

  @Post('clock-in')
  @Roles(UserRole.PARKING_EMPLOYEE)
  clockIn(@CurrentUser('id') userId: string) {
    return this.employeesService.clockIn(userId);
  }

  @Post('clock-out')
  @Roles(UserRole.PARKING_EMPLOYEE)
  clockOut(@CurrentUser('id') userId: string) {
    return this.employeesService.clockOut(userId);
  }

  @Patch(':id')
  @Roles(UserRole.PARKING_OWNER, UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateEmployeeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.employeesService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.PARKING_OWNER, UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    console.log(userId)
    return this.employeesService.remove(id, userId);
  }
}