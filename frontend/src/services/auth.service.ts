import { api } from './api';
import type{
  LoginDto,
  LoginResponseDto,
  RegisterClientDto,
  RegisterOwnerCompleteDto,
  RegisterOwnerCompleteResponseDto,
  RegisterEmployeeDto,
  RegisterEmployeeResponseDto,
  UpdateProfileDto,
  ProfileResponseDto,
  VerifyEmailDto,
  VerifyEmailResponseDto,
  ResendVerificationDto,
  UserResponseDto,
} from '../types/auth.types';


export const authService = {
  // ============================================
  // AUTENTICACIÓN
  // ============================================

  /**
   * Login de usuario
   */
  async login(data: LoginDto): Promise<LoginResponseDto> {    
  const response = await api.post<LoginResponseDto>('/auth/login', data);
    console.log(api)
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Logout
   */
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/';
  },

  /**
   * Obtener usuario actual del localStorage
   */
  getCurrentUser(): UserResponseDto | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Verificar si está autenticado
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },

  // ============================================
  // REGISTRO
  // ============================================

  /**
   * Registro de cliente
   */
  async registerClient(data: RegisterClientDto): Promise<LoginResponseDto> {
  const response = await api.post<LoginResponseDto>('/auth/register/client', data);
  // NOTA: No guardamos el token automáticamente para clientes
  // porque requieren verificación de email
  return response.data;
},

  /**
   * Registro completo de dueño (con estacionamiento)
   */
  async registerOwnerComplete(data: RegisterOwnerCompleteDto): Promise<RegisterOwnerCompleteResponseDto> {
    const response = await api.post<RegisterOwnerCompleteResponseDto>('/auth/register/owner-complete', data);
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Registro de empleado (solo dueño)
   */
  async registerEmployee(data: RegisterEmployeeDto): Promise<RegisterEmployeeResponseDto> {
    const response = await api.post<RegisterEmployeeResponseDto>('/auth/register/employee', data);
    return response.data;
  },

  // ============================================
  // PERFIL
  // ============================================

  /**
   * Obtener perfil completo
   */
  async getProfile(): Promise<ProfileResponseDto> {
    const response = await api.get<ProfileResponseDto>('/auth/profile');
    return response.data;
  },

  /**
   * Actualizar perfil
   */
  async updateProfile(data: UpdateProfileDto): Promise<ProfileResponseDto> {
    const response = await api.patch<ProfileResponseDto>('/auth/profile', data);
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // ============================================
  // VERIFICACIÓN DE EMAIL
  // ============================================

  /**
   * Verificar email con token
   */
  async verifyEmail(token: string): Promise<VerifyEmailResponseDto> {
    const response = await api.post<VerifyEmailResponseDto>('/auth/verify-email', { token });
    return response.data;
  },

  /**
   * Reenviar verificación de email
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/resend-verification', { email });
    return response.data;
  },
};