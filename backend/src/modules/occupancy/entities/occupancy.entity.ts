import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  JoinColumn, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';
import { Space } from '../../spaces/entities/space.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { VehicleType } from '../../common/enums/vehicle-type.enum';

@Entity('occupancies')
export class Occupancy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'space_id', type: 'uuid' })
  spaceId!: string;

  @ManyToOne(() => Space)
  @JoinColumn({ name: 'space_id' })
  space!: Space;

  @Column({ name: 'reservation_id', type: 'uuid', nullable: true })
  reservationId?: string;

  @ManyToOne(() => Reservation, { nullable: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Reservation;

  @Column({ name: 'vehicle_plate' })
  vehiclePlate!: string;

  @Column({ type: 'enum', enum: VehicleType })
  vehicleType!: VehicleType;

  @Column({ name: 'check_in_time', type: 'timestamp' })
  checkInTime!: Date;

  @Column({ name: 'check_out_time', type: 'timestamp', nullable: true })
  checkOutTime?: Date;

  @Column({ name: 'checked_in_by', type: 'uuid' })
  checkedInBy!: string;

  @Column({ name: 'checked_out_by', type: 'uuid', nullable: true })
  checkedOutBy?: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  totalAmount?: number;

  @Column({ default: false })
  isCompleted!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
