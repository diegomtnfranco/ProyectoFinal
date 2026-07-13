import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ParkingLot } from '../../parking-lots/entities/parking-lot.entity';

@Entity('parking_owners')
export class ParkingOwner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;  // ← camelCase

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
  
  @Column()
  name!: string;

  @Column({ name: 'business_name' })
  businessName!: string;  // ← camelCase

  @Column({ unique: true , nullable: true })
  cuit?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ name: 'is_approved', default: false })
  isApproved!: boolean;  // ← camelCase

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => ParkingLot, parkingLot => parkingLot.owner)
  parkingLots?: ParkingLot[];
}