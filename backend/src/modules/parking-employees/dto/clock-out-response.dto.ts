import { ApiProperty } from '@nestjs/swagger';

export class ClockOutResponseDto {
  @ApiProperty({
    example: 'Se registró el fin de turno',
    description: 'Mensaje confirmatorio de clock-out',
  })
  message!: string;

  @ApiProperty({
    example: '2024-01-15T17:00:00Z',
    description: 'Fecha y hora del clock-out',
  })
  clockTime!: Date;

  @ApiProperty({
    example: false,
    description: 'Indica si el empleado está actualmente en turno',
  })
  isClocked!: boolean;

  @ApiProperty({
    example: 9.0,
    description: 'Duración del turno en horas',
    required: false,
  })
  hoursWorked?: number;
}
