import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ParkingLot } from '../../parking-lots/entities/parking-lot.entity';

@Entity('parking_employees')
export class ParkingEmployee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'parking_lot_id', type: 'uuid' })
  parkingLotId!: string;

  @ManyToOne(() => ParkingLot)
  @JoinColumn({ name: 'parking_lot_id' })
  parkingLot!: ParkingLot;

  @Column()
  name!: string;

  @Column({nullable: true })
  employeeCode!: string;

  @Column({ name: 'position', nullable: true })
  position?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}