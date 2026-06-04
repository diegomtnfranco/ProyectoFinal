import {api }from '../../../services/api'

export const getCompanies = async () => {
  const response = await api.get('/parking-owners')

  return response.data
}

export const createCompany = async (data: any) => {
  const response = await api.post(
    '/parking-owners',
    data
  )

  return response.data
}

export const updateCompany = async (
  id: number,
  data: any
) => {
  const response = await api.patch(
    `/parking-owners/${id}`,
    data
  )

  return response.data
}

export const activateCompany = async (
  id: number
) => {
  const response = await api.patch(
    `/parking-owners/${id}/activate`
  )

  return response.data
}

export const deactivateCompany = async (
  id: number
) => {
  const response = await api.patch(
    `/parking-owners/${id}/deactivate`
  )

  return response.data
}