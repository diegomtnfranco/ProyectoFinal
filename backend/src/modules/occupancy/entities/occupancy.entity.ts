// src/modules/occupancy/entities/active-occupancy.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  JoinColumn,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { Space } from '../../spaces/entities/space.entity';
import { ClientProfile } from '../../client-profiles/entities/client-profile.entity';

export enum OccupancyStatus {
  ACTIVE = 'active',
  CHECKING_OUT = 'checking_out',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

@Entity('active_occupancies')
export class ActiveOccupancy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  reservation_id!: string;

  @OneToOne(() => Reservation)
  @JoinColumn({ name: 'reservation_id' })
  reservation!: Reservation;

  @Column({ type: 'uuid' })
  space_id!: string;

  @ManyToOne(() => Space)
  @JoinColumn({ name: 'space_id' })
  space!: Space;

  @Column({ type: 'uuid' })
  client_id!: string;

  @ManyToOne(() => ClientProfile)
  @JoinColumn({ name: 'client_id' })
  client!: ClientProfile;

  @Column({ type: 'timestamp' })
  check_in_time!: Date;

  @Column({ type: 'timestamp', nullable: true })
  check_out_time!: Date;

  @Column({ type: 'enum', enum: OccupancyStatus, default: OccupancyStatus.ACTIVE })
  status!: OccupancyStatus;

  @Column({ type: 'jsonb', nullable: true })
  check_in_metadata!: {
    method: 'qrcode' | 'manual' | 'auto';
    verified_by?: string;
    vehicle_plate_verified: boolean;
    photo_reference?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  check_out_metadata!: {
    final_amount?: number;
    payment_method?: string;
    photo_reference?: string;
    verified_by?: string;
  };

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

    constructor(partial: Partial<ActiveOccupancy>) {   
        Object.assign(this, partial);

    }
}