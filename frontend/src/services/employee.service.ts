import api from './api';

const employeeService = {
  listEmployees: async () => {
    const response = await api.get('/employees');
    return response.data;
  },
  createEmployee: async (payload: { name: string; email: string; role: string }) => {
    const response = await api.post('/employees', payload);
    return response.data;
  }
};

export default employeeService;
