// src/auth/dto/profile-response.dto.ts
import { UserRole } from '../../users/entities/user.entity';
import { VehicleTypeEnum } from '../../client-profiles/entities/client-profile.entity';

export class UserProfileDto {
  id!: string;
  email!: string;
  role!: UserRole;
  avatarUrl?: string;
  isVerified!: boolean;
  isActive!: boolean;
  createdAt!: Date;
}

export class ClientProfileDto {
  id!: string;
  name!: string;
  phone!: string;
  defaultVehiclePlate?: string;
  defaultVehicleType?: VehicleTypeEnum;
}

export class OwnerProfileDto {
  id!: string;
  businessName!: string;
  cuit?: string;
  phone?: string;
  address?: string;
  isApproved!: boolean;
}

export class EmployeeProfileDto {
  id!: string;
  name!: string;
  employeeCode?: string;
  position?: string;
  isActive!: boolean;
  parkingLotId!: string;
  parkingLotName!: string;
}

export class ProfileResponseDto {
  user!: UserProfileDto;
  clientProfile?: ClientProfileDto;
  ownerProfile?: OwnerProfileDto;
  employeeProfile?: EmployeeProfileDto;
}