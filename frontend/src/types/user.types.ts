export type UserRole = 'client' | 'parking_owner' | 'parking_employee' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  verified?: boolean;
}
