// src/utils/apiClient.js
import axios from 'axios';

// Create a base axios instance with the correct API base URL
const apiClient = axios.create({
  baseURL: '/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to handle authentication tokens if needed
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors (token expired, etc.)
    if (error.response && error.response.status === 401) {
      // Redirect to login or refresh token
      console.log('Authentication error, please login again');
      // You could dispatch a logout action here if using Redux
    }
    return Promise.reject(error);
  }
);

export default apiClient;
