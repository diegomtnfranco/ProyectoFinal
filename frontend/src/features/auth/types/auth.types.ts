export interface LoginPayload {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'driver' | 'owner' | 'admin'
}