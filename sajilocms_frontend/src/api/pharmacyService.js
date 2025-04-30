import { rootAxiosInstance } from './axiosInstance';

const API_URL = '/api/pharmacy';

const handleApiError = async (error, endpoint) => {
  console.error(`API Error (${endpoint}):`, error);
  const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
  throw {
    message: errorMessage,
    status: error.response?.status,
    endpoint,
    originalError: error
  };
};

export const pharmacyService = {
  // Medicine APIs
  getMedicines: async () => {
    try {
      const response = await rootAxiosInstance.get(`${API_URL}/medicines/`);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'getMedicines');
    }
  },

  getMedicine: async (id) => {
    try {
      const response = await rootAxiosInstance.get(`${API_URL}/medicines/${id}/`);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'getMedicine');
    }
  },

  createMedicine: async (data) => {
    try {
      console.log('Creating medicine with data:', data);
      const response = await rootAxiosInstance.post(`${API_URL}/medicines/`, data);
      console.log('Create medicine response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create medicine error details:', {
        status: error.response?.status,
        data: error.response?.data,
        error: error.message
      });
      return handleApiError(error, 'createMedicine');
    }
  },

  updateMedicine: async (id, data) => {
    try {
      const response = await rootAxiosInstance.put(`${API_URL}/medicines/${id}/`, data);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'updateMedicine');
    }
  },

  deleteMedicine: async (id) => {
    try {
      const response = await rootAxiosInstance.delete(`${API_URL}/medicines/${id}/`);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'deleteMedicine');
    }
  },

  // Order APIs
  getOrders: (params) => rootAxiosInstance.get(`${API_URL}/orders/`, { params }),
  getOrder: (id) => rootAxiosInstance.get(`${API_URL}/orders/${id}/`),
  createOrder: (data) => rootAxiosInstance.post(`${API_URL}/orders/`, data),
  updateOrder: (id, data) => rootAxiosInstance.put(`${API_URL}/orders/${id}/`, data),
  deleteOrder: (id) => rootAxiosInstance.delete(`${API_URL}/orders/${id}/`),
  fulfillOrder: (id) => rootAxiosInstance.post(`${API_URL}/orders/${id}/fulfill/`),

  // Billing APIs
  getBillings: (params) => rootAxiosInstance.get(`${API_URL}/billings/`, { params }),
  getBilling: (id) => rootAxiosInstance.get(`${API_URL}/billings/${id}/`),
  updateBilling: (id, data) => rootAxiosInstance.put(`${API_URL}/billings/${id}/`, data),

  // Stock Transaction APIs
  getStockTransactions: async (params) => {
    try {
      const response = await rootAxiosInstance.get(`${API_URL}/stock-transactions/`, { params });
      return response.data;
    } catch (error) {
      return handleApiError(error, 'getStockTransactions');
    }
  },

  createStockTransaction: async (data) => {
    try {
      const response = await rootAxiosInstance.post(`${API_URL}/stock-transactions/`, data);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'createStockTransaction');
    }
  },

  addStock: async (data) => {
    try {
      const response = await rootAxiosInstance.post(`${API_URL}/add-stock/`, data);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'addStock');
    }
  },

  // Report APIs
  getStockReport: () => rootAxiosInstance.get(`${API_URL}/reports/stock/`),
  getExpiredMedicines: () => rootAxiosInstance.get(`${API_URL}/reports/expired/`),
  getMostUsedMedicines: () => rootAxiosInstance.get(`${API_URL}/reports/most-used/`),

  // Audit Logs API
  getAuditLogs: (params) => rootAxiosInstance.get(`${API_URL}/audit-logs/`, { params }),
};

export default pharmacyService; 