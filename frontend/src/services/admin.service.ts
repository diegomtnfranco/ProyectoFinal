import api from './api';

const adminService = {
  listUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  listPendingOwners: async () => {
    const response = await api.get('/admin/pending-owners');
    return response.data;
  },
  approveOwner: async (id: string) => {
    const response = await api.post(`/admin/pending-owners/${id}/approve`);
    return response.data;
  },
  getGlobalStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  }
};

export default adminService;
