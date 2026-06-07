// frontend/src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth.service';
import type { UserResponseDto, LoginDto, UpdateProfileDto, RegisterClientDto, RegisterOwnerCompleteResponseDto, RegisterOwnerCompleteDto, LoginResponseDto } from '../types/auth.types';

interface AuthState {
    user: UserResponseDto | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    lastRegisterResponse: RegisterOwnerCompleteResponseDto | null;
    lastRegisterMessage: string | null;
    // Acciones
    login: (credentials: LoginDto) => Promise<void>;
    registerClient: (data: RegisterClientDto) => Promise<{ message: string } | void>;
    registerOwnerComplete: (data: RegisterOwnerCompleteDto) => Promise<RegisterOwnerCompleteResponseDto>;
    logout: () => void;
    updateProfile: (data: UpdateProfileDto) => Promise<void>;
    getProfile: () => Promise<void>;
    clearError: () => void;
    verifyEmail: (token: string) => Promise<void>;
    clearRegisterMessage: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({  // ← Eliminamos 'get' que no se usaba
            // Estado inicial
            user: null,
            token: null,
            isLoading: false,
            error: null,
            lastRegisterResponse: null,
            lastRegisterMessage: null,

            // Login
            login: async (credentials) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authService.login(credentials);
                    set({
                        user: response.user,
                        token: response.access_token,
                        isLoading: false,
                    });
                } catch (error) {
                    set({ error: error as string, isLoading: false });
                    throw error;
                }
            },
            
            registerClient: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authService.registerClient(data);
                    // Extraer el mensaje de la respuesta
                    const message = response.message || 'Registro exitoso. Se ha enviado un email de verificación.';
                    
                    set({ 
                        isLoading: false,
                        lastRegisterMessage: message
                    });
                    
                    return { message };
                } catch (error) {
                    set({ error: error as string, isLoading: false });
                    throw error;
                }
            },

            registerOwnerComplete: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authService.registerOwnerComplete(data);
                    set({
                        lastRegisterResponse: response,
                        lastRegisterMessage: response.message,
                        isLoading: false
                    });
                    return response;
                } catch (error) {
                    set({ error: error as string, isLoading: false });
                    throw error;
                }
            },

            // Logout
            logout: () => {
                authService.logout();
                set({ user: null, token: null, error: null, lastRegisterMessage: null });
            },

            // Actualizar perfil
            updateProfile: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authService.updateProfile(data);
                    set({ user: response.user, isLoading: false });
                } catch (error) {
                    set({ error: error as string, isLoading: false });
                    throw error;
                }
            },

            // Obtener perfil
            getProfile: async () => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authService.getProfile();
                    set({ user: response.user, isLoading: false });
                } catch (error) {
                    set({ error: error as string, isLoading: false });
                    throw error;
                }
            },

            // Limpiar error
            clearError: () => set({ error: null }),
            
            // Limpiar mensaje de registro
            clearRegisterMessage: () => set({ lastRegisterMessage: null }),

            // Verificar email
            verifyEmail: async (token: string) => {
                set({ isLoading: true, error: null });
                try {
                    await authService.verifyEmail(token);
                    set({ isLoading: false });
                } catch (error) {
                    set({ error: error as string, isLoading: false });
                    throw error;
                }
            },
        }),

        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                lastRegisterResponse: state.lastRegisterResponse,
                lastRegisterMessage: state.lastRegisterMessage,
            }),
        }
    )
);