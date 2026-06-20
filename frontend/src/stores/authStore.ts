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
    updateUser: (userData: Partial<UserResponseDto>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({ // ← Añadimos 'get' que ahora si se usa para leer el estado actual.
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
            
            // Registro de cliente
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

            // Registro completo de dueño (con estacionamiento)
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

            // Actualizar datos del usuario en el estado (sin llamar a la API, útil para cambios locales como el avatar)
            updateUser: (userData) => {
                const currentUser = get().user;

                if (!currentUser) return;

                set({
                    user: {
                    ...currentUser,
                    ...userData,
                    },
                });
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