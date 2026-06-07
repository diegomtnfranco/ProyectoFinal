import { api } from '../../../services/api'

export const getCompanies = async () => {
  const response = await api.get(
    '/parking-owners'
  )

  return response.data
}

export const getPendingCompanies =
  async () => {
    const response =
      await api.get(
        '/parking-owners/pending'
      )

    return response.data
  }

export const approveCompany = async (
  ownerId: string
) => {
  const response = await api.patch(
    `/parking-owners/${ownerId}/approve`
  )

  return response.data
}

export const activateUser = async (
  userId: string
) => {
  const response = await api.patch(
    `/users/${userId}/activate`
  )

  return response.data
}

export const deactivateUser = async (
  userId: string
) => {
  const response = await api.patch(
    `/users/${userId}/deactivate`
  )

  return response.data
}