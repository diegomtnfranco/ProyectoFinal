import { ApiProperty } from '@nestjs/swagger';

export class ClockInResponseDto {
  @ApiProperty({
    example: 'Se registró el inicio de turno',
    description: 'Mensaje confirmatorio de clock-in',
  })
  message!: string;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Fecha y hora del clock-in',
  })
  clockTime!: Date;

  @ApiProperty({
    example: true,
    description: 'Indica si el empleado está actualmente en turno',
  })
  isClocked!: boolean;
}
