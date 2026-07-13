import { ApiProperty } from '@nestjs/swagger';
import { LoginUserResponseDto } from './login-response.dto';

class ParkingLotCreatedDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Garaje Centro - Principal' })
  name!: string;

  @ApiProperty({ example: 30 })
  totalSpaces!: number;

  @ApiProperty({ example: { from: '001', to: '030' } })
  spacesRange!: { from: string; to: string };
}

export class RegisterOwnerCompleteResponseDto {
  @ApiProperty({ type: LoginUserResponseDto })
  user!: LoginUserResponseDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token!: string;

  @ApiProperty({ type: ParkingLotCreatedDto })
  parkingLot!: ParkingLotCreatedDto;

  @ApiProperty({ example: true })
  requiresVerification!: boolean;

  @ApiProperty({ example: true })
  requiresApproval!: boolean;

  @ApiProperty({ example: 'Estacionamiento creado exitosamente...' })
  message!: string;
}