// src/modules/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToOne, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { ClientProfile } from '../../client-profiles/entities/client-profile.entity';
import { ParkingOwner } from '../../parking-owners/entities/parking-owner.entity';
import { ParkingEmployee } from '../../parking-employees/entities/parking-employee.entity';

export enum UserRole {
  CLIENT = 'client',
  PARKING_OWNER = 'parking_owner',
  PARKING_EMPLOYEE = 'parking_employee',  // ← NUEVO ROL
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role!: UserRole;

  @Column({ name: 'google_id', nullable: true })
  googleId?: string;

  @Column({ name: 'facebook_id', nullable: true })
  facebookId?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'is_oauth_user', default: false })
  isOauthUser!: boolean;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  // Token para verificación de email
  @Column({ name: 'verification_token', nullable: true, type: 'text' })
  verificationToken?: string;

  // Token para recuperación de contraseña
  @Column({ name: 'reset_password_token', nullable: true, type: 'text' })
  resetPasswordToken?: string;

  @Column({ name: 'reset_password_expires', nullable: true, type: 'timestamp' })
  resetPasswordExpires?: Date;

  @Column({ type: 'jsonb', name: 'oauth_data', nullable: true })
  oauthData?: {
    provider: 'google' | 'facebook';
    accessToken?: string;
    refreshToken?: string;
    lastLogin: Date;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relaciones
  @OneToOne(() => ClientProfile, profile => profile.user)
  clientProfile?: ClientProfile;

  @OneToOne(() => ParkingOwner, owner => owner.user)
  parkingOwnerProfile?: ParkingOwner;

  @OneToOne(() => ParkingEmployee, employee => employee.user)
  parkingEmployeeProfile?: ParkingEmployee;  // ← NUEVA RELACIÓN


  @BeforeInsert()
  checkFieldsInsert() {
    this.email = this.email.toLowerCase().trim();
  }

  @BeforeUpdate()
  checkFieldsUpdate() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }

}