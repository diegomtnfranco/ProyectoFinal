import { UserRole, User } from './user.types';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterClientData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterOwnerData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  businessName: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerClient: (data: RegisterClientData) => Promise<void>;
  registerOwner: (data: RegisterOwnerData) => Promise<void>;
  logout: () => void;
  getProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}
