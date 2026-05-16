import axios from 'axios'

import type { LoginPayload } from '../types/auth.types'

const API_URL = 'http://localhost:3000/api'

export const login = async (payload: LoginPayload) => {
  const response = await axios.post(`${API_URL}/auth/login`, payload)

  return response.data
}