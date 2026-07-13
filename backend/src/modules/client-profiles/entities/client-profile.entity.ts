import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';

export enum VehicleTypeEnum {
  CAR = 'car',
  TRUCK = 'truck',
  MOTORCYCLE = 'motorcycle',
  VAN = 'van',
}

@Entity('client_profiles')
export class ClientProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;  // ← camelCase

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  name!: string;

 @Column({ type: 'varchar', nullable: true }) // ← Especificar el tipo explícitamente
  phone!: string | null;

  @Column({ name: 'default_vehicle_plate', nullable: true })
  defaultVehiclePlate?: string;  // ← camelCase

  @Column({ name: 'default_vehicle_type', type: 'enum', enum: VehicleTypeEnum, nullable: true })
  defaultVehicleType?: VehicleTypeEnum;

  @Column({ name: 'last_active_at', type: 'timestamp', nullable: true })
  lastActiveAt?: Date;

  @OneToMany(() => Reservation, reservation => reservation.client)
  reservations?: Reservation[];
}