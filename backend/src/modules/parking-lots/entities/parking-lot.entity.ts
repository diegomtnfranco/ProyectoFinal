// src/modules/parking-lots/entities/parking-lot.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  JoinColumn, 
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { ParkingOwner } from '../../parking-owners/entities/parking-owner.entity';
import { Space } from '../../spaces/entities/space.entity';
import { Rate } from '../../rates/entities/rate.entity';

@Entity('parking_lots')
export class ParkingLot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => ParkingOwner)
  @JoinColumn({ name: 'owner_id' })
  owner!: ParkingOwner;

  @Column()
  name!: string;

  @Column()
  address!: string;

  @Column('decimal', { precision: 10, scale: 7 })
  latitude!: number;

  @Column('decimal', { precision: 10, scale: 7 })
  longitude!: number;

  @Column({ name: 'open_time', type: 'time' })
  openTime!: string;

  @Column({ name: 'close_time', type: 'time' })
  closeTime!: string;

  // ✅ CORREGIDO: usar objeto literal, no función que retorna string
  @Column({ type: 'jsonb', default: {
    allowOnlineReservations: true,
    cancellationMinutesBefore: 30,
    reservationHoldMinutes: 120,
    blockSpaceHoursBefore: 2,
    maxReservationHours: 24,
    maxAdvanceDays: 7
  } })
  settings!: {
    allowOnlineReservations: boolean;
    cancellationMinutesBefore: number;
    reservationHoldMinutes: number;
    blockSpaceHoursBefore: number;
    maxReservationHours?: number;
    maxAdvanceDays?: number;
  };

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Space, space => space.parkingLot)
  spaces!: Space[];

  @OneToMany(() => Rate, rate => rate.parkingLot)
  rates!: Rate[];
}