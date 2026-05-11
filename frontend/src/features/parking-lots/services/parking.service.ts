import axios from 'axios'

const API_URL = 'http://localhost:3000'

export const getParkingLots = async () => {
  const response = await axios.get(`${API_URL}/parking-lots`)

  return response.data
}