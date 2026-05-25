import axios from 'axios'

import type { LoginPayload } from '../types/auth.types'


export const login = async (payload: LoginPayload) => {
  const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, payload)

  return response.data
}