import { create } from 'zustand';
import authService from '../services/auth.service';
import { AuthState, LoginData, RegisterClientData, RegisterOwnerData, UpdateProfileData } from '../types/auth.types';
import { User } from '../types/user.types';

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('parking_token'),
  isLoading: false,
  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await authService.login({ email, password });
      localStorage.setItem('parking_token', result.token);
      set({ user: result.user, token: result.token });
    } finally {
      set({ isLoading: false });
    }
  },
  registerClient: async (data: RegisterClientData) => {
    set({ isLoading: true });
    try {
      await authService.registerClient(data);
    } finally {
      set({ isLoading: false });
    }
  },
  registerOwner: async (data: RegisterOwnerData) => {
    set({ isLoading: true });
    try {
        console.log(data)
      await authService.registerOwner(data);
    } finally {
      set({ isLoading: false });
    }
  },
  logout: () => {
    localStorage.removeItem('parking_token');
    set({ user: null, token: null });
  },
  getProfile: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.getProfile();
      set({ user });
    } finally {
      set({ isLoading: false });
    }
  },
  updateProfile: async (data: UpdateProfileData) => {
    set({ isLoading: true });
    try {
      const user = await authService.updateProfile(data);
      set({ user });
    } finally {
      set({ isLoading: false });
    }
  }
}));

export default useAuthStore;
