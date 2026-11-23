import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { NightPolicyService } from './night-policy.service';
import { UpdateNightPolicyDto } from './dto/night-policy.dto';
import type { AccessRequester } from './parking-lot-access.service';

@ApiTags('parking-profiles')
@ApiBearerAuth()
@Controller('parking-profiles')
export class NightPolicyController {
  constructor(private readonly service: NightPolicyService) {}

  @Get(':parkingLotId/night-policy')
  @Roles(UserRole.PARKING_OWNER)
  @ApiOperation({
    summary: 'Ver la política de tarifa nocturna (solo el dueño)',
  })
  get(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @CurrentUser() user: AccessRequester,
  ) {
    return this.service.get(parkingLotId, user);
  }

  @Put(':parkingLotId/night-policy')
  @Roles(UserRole.PARKING_OWNER)
  @ApiOperation({
    summary: 'Configurar la política de tarifa nocturna (solo el dueño)',
  })
  update(
    @Param('parkingLotId', ParseUUIDPipe) parkingLotId: string,
    @Body() dto: UpdateNightPolicyDto,
    @CurrentUser() user: AccessRequester,
  ) {
    return this.service.update(parkingLotId, dto, user);
  }
}
