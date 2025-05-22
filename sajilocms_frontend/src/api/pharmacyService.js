// src/api/pharmacyService.js
import apiClient from '../utils/apiClient';

const API_URL = '/pharmacy/';
// This path should match the one defined in the backend URLs configuration

// Medicine endpoints
export const fetchMedicines = async (params = {}) => {
  try {
    const response = await apiClient.get(`${API_URL}medicines/`, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchMedicineById = async (id) => {
  try {
    const response = await apiClient.get(`${API_URL}medicines/${id}/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createMedicine = async (medicineData) => {
  try {
    const response = await apiClient.post(`${API_URL}medicines/`, medicineData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateMedicine = async (id, medicineData) => {
  try {
    const response = await apiClient.put(`${API_URL}medicines/${id}/`, medicineData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Category endpoints
export const fetchCategories = async () => {
  try {
    const response = await apiClient.get(`${API_URL}categories/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createCategory = async (categoryData) => {
  try {
    const response = await apiClient.post(`${API_URL}categories/`, categoryData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Cart endpoints
export const fetchCart = async () => {
  try {
    const response = await apiClient.get(`${API_URL}cart/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addToCart = async (medicineId, quantity) => {
  try {
    const response = await apiClient.post(`${API_URL}cart/items/`, {
      medicine: medicineId,
      quantity: quantity
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateCartItem = async (itemId, quantity) => {
  try {
    const response = await apiClient.put(`${API_URL}cart/items/${itemId}/`, {
      quantity: quantity
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeCartItem = async (itemId) => {
  try {
    const response = await apiClient.delete(`${API_URL}cart/items/${itemId}/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const clearCart = async () => {
  try {
    const response = await apiClient.delete(`${API_URL}cart/clear/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Order endpoints
export const fetchOrders = async (params = {}) => {
  try {
    const response = await apiClient.get(`${API_URL}orders/`, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchOrderById = async (id) => {
  try {
    const response = await apiClient.get(`${API_URL}orders/${id}/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createOrder = async (orderData) => {
  try {
    const response = await apiClient.post(`${API_URL}orders/create/`, orderData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateOrderStatus = async (id, status) => {
  try {
    const response = await apiClient.patch(`${API_URL}orders/${id}/`, { status });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Payment endpoints
export const fetchPayments = async (params = {}) => {
  try {
    const response = await apiClient.get(`${API_URL}payments/`, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createPayment = async (paymentData) => {
  try {
    const response = await apiClient.post(`${API_URL}payments/`, paymentData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updatePayment = async (id, paymentData) => {
  try {
    const response = await apiClient.patch(`${API_URL}payments/${id}/`, paymentData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Stock endpoints
export const fetchStockBatches = async (params = {}) => {
  try {
    const response = await apiClient.get(`${API_URL}stock/batches/`, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createStockBatch = async (batchData) => {
  try {
    const response = await apiClient.post(`${API_URL}stock/batches/`, batchData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchStockMovements = async (params = {}) => {
  try {
    const response = await apiClient.get(`${API_URL}stock/movements/`, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createStockMovement = async (movementData) => {
  try {
    const response = await apiClient.post(`${API_URL}stock/movements/`, movementData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Report endpoints
export const fetchLowStockReport = async () => {
  try {
    const response = await apiClient.get(`${API_URL}reports/low-stock/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchExpiryReport = async () => {
  try {
    const response = await apiClient.get(`${API_URL}reports/expiry/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchSalesReport = async (period = 'month') => {
  try {
    const response = await apiClient.get(`${API_URL}reports/sales/?period=${period}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Dashboard statistics
export const fetchDashboardStats = async () => {
  try {
    const response = await apiClient.get(`${API_URL}dashboard/stats/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
