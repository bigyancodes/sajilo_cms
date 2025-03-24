// src/api/axiosInstance.js
import axios from "axios";

// Base URL - Ensure this matches your actual Django backend URL
const API_BASE_URL = "http://localhost:8000/auth/";

// Create Axios instance with base config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Essential for cookies to be sent with requests
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Refreshing token state tracking
let isRefreshing = false;
let refreshSubscribers = [];
let lastRefreshTime = 0; // To prevent too frequent refreshes

// Subscribe to token refresh
function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

// Notify subscribers that token has been refreshed
function onTokenRefreshed() {
  refreshSubscribers.forEach((callback) => callback());
  refreshSubscribers = [];
}

// Refresh Access Token with throttling to prevent hammering the server
async function refreshAccessToken() {
  // Prevent frequent refreshes (no more than once every 10 seconds)
  const now = Date.now();
  if (now - lastRefreshTime < 10000) {
    console.log("🔄 Token refresh throttled - too many attempts");
    return false;
  }

  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh(resolve);
    });
  }

  isRefreshing = true;
  lastRefreshTime = now;

  try {
    // Get CSRF token from localStorage (not from cookie)
    const csrfToken = localStorage.getItem("csrftoken");
    
    console.log("🔄 Attempting token refresh");
    
    // Make refresh token request with direct axios (not instance)
    const response = await axios({
      method: 'post',
      url: `${API_BASE_URL}token/refresh/`,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken || '',
        // Add cache control headers
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      // Empty body since we're using cookies
      data: {}
    });

    console.log("🔄 Token refresh successful", response.data);
    
    // If the response includes user data, store it
    if (response.data && response.data.user) {
      localStorage.setItem('userData', JSON.stringify(response.data.user));
    }
    
    onTokenRefreshed();
    return true;
  } catch (error) {
    console.error("🔴 Refresh token error:", error);
    return false;
  } finally {
    isRefreshing = false;
  }
}

// Logout Function - exported separately so we don't create circular dependencies
export function logoutUser() {
  try {
    // Try to call the logout endpoint to blacklist refresh token
    axiosInstance.post("/logout/")
      .catch(() => console.log("Logout endpoint failed, clearing cookies anyway"));
  } catch (error) {
    console.error("Error calling logout endpoint:", error);
  } finally {
    // Remove user data from localStorage
    localStorage.removeItem('userData');
    localStorage.removeItem('csrftoken');
    
    // Redirect to login page if not already there
    if (!window.location.pathname.includes('/login')) {
      console.log("Redirecting to login page after logout");
      window.location.href = "/login";
    }
  }
}

// Fetch CSRF Token
export const fetchCSRFToken = async () => {
  try {
    // Check if we already have a CSRF token in localStorage
    const existingToken = localStorage.getItem("csrftoken");
    if (existingToken) {
      console.log("✅ Using existing CSRF token from localStorage");
      return { data: { csrf: existingToken, message: "Using existing CSRF token" } };
    }

    // If not, fetch a new one
    const response = await axiosInstance.get("csrf/");
    
    // Store the token in localStorage
    if (response.data && response.data.csrf) {
      localStorage.setItem("csrftoken", response.data.csrf);
    }
    
    console.log("✅ CSRF token fetched and stored in localStorage");
    return response;
  } catch (error) {
    console.error("🔴 Failed to fetch CSRF token:", error);
    return { data: { message: "CSRF token fetch failed but continuing" } };
  }
};

// Request Interceptor (Attach CSRF from localStorage)
axiosInstance.interceptors.request.use(
  async (config) => {
    const csrfToken = localStorage.getItem("csrftoken");
    if (csrfToken && (config.method === 'post' || config.method === 'put' || config.method === 'delete')) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor (Handle 401/403)
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Network errors shouldn't trigger token refresh
    if (!error.response) {
      return Promise.reject(error);
    }
    
    // If error is 401/403 and we haven't tried refreshing yet
    if ((error.response.status === 401 || error.response.status === 403) && 
        !originalRequest._retry && 
        !originalRequest.url.includes('token/refresh')) {
      
      originalRequest._retry = true;
      
      // Try to refresh token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry the original request
        return axiosInstance(originalRequest);
      } else {
        // If refresh failed and we're not already at the login page
        if (!window.location.pathname.includes('/login')) {
          // Remove user data from localStorage
          localStorage.removeItem('userData');
          
          // Redirect to login page after a short delay
          setTimeout(() => {
            window.location.href = "/login";
          }, 100);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Specialized API function to silently refresh token without redirecting on failure
export const silentTokenRefresh = async () => {
  try {
    const csrfToken = localStorage.getItem("csrftoken");
    
    const response = await axios({
      method: 'post',
      url: `${API_BASE_URL}token/refresh/`,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken || '',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      data: {}
    });
    
    // If the response includes user data, store it
    if (response.data && response.data.user) {
      localStorage.setItem('userData', JSON.stringify(response.data.user));
    }
    
    console.log("Silent token refresh successful");
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Silent token refresh failed:", error);
    return { success: false, error };
  }
};

// API Functions
export const fetchAllDoctors = (url = "doctors/") => axiosInstance.get(url);
export const fetchDoctorById = (id) => axiosInstance.get(`doctors/${id}/`);
export const fetchSpecialties = () => axiosInstance.get("specialties/");
export const fetchUsers = () => axiosInstance.get("admin/users/");
export const verifyStaff = (staffId) =>
  axiosInstance.post("admin/verify-staff/", { staff_id: staffId });
export const registerStaff = (data) => 
  axiosInstance.post("admin/register-staff/", data);

export default axiosInstance;