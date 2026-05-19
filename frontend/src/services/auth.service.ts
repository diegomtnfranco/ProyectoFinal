import api from './api';
import type { LoginData, RegisterClientData, RegisterOwnerData, UpdateProfileData } from '../types/auth.types';
import type { User } from '../types/user.types';

const authService = {
  login: async (data: LoginData) => {
    const response = await api.post<{ token: string; user: User }>('/auth/login', data);
    return response.data;
  },
  registerClient: async (data: RegisterClientData) => {
    const response = await api.post<{ message: string }>('/auth/register/client', data);
    return response.data;
  },
  registerOwner: async (data: RegisterOwnerData) => {
    console.log(data);
    const response = await api.post<{ message: string }>('/auth/register/owner', data);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get<User>('/auth/profile');
    return response.data;
  },
  updateProfile: async (data: UpdateProfileData) => {
    const response = await api.patch<User>('/auth/profile', data);
    return response.data;
  }
};

export default authService;
