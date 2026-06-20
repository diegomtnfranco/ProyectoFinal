import { ApiProperty } from '@nestjs/swagger';

export class AnonymousCheckInResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  spaceNumber!: string;

  @ApiProperty()
  checkInTime!: Date;
}

export class AnonymousCheckOutResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  spaceNumber!: string;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  hours!: number;

  @ApiProperty()
  checkInTime!: Date;

  @ApiProperty()
  checkOutTime!: Date;
}