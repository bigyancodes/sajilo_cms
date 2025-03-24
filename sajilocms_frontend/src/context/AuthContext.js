// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from "react";
import axiosInstance, { fetchCSRFToken, silentTokenRefresh } from "../api/axiosInstance";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Clear user session and localStorage
  const clearUserSession = useCallback(() => {
    setUser(null);
    localStorage.removeItem('userData');
    localStorage.removeItem('lastTokenRefresh');
    
    // Log result
    console.log("User session cleared");
  }, []);

  // Logout Function
  const logout = useCallback(async (redirect = true) => {
    try {
      console.log("Logging out user...");
      
      // Attempt to blacklist the token
      try {
        await axiosInstance.post("/logout/");
        console.log("Logout endpoint success");
      } catch (error) {
        console.error("Logout endpoint failed:", error);
      }
      
      // Always clear session regardless of API success
      clearUserSession();

      if (redirect) {
        console.log("Redirecting to login page");
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("🔴 Logout error:", error);
      clearUserSession();
      if (redirect) {
        window.location.href = "/login";
      }
    }
  }, [clearUserSession]);

  // Refresh token if needed - don't check for cookie directly
  const refreshTokenIfNeeded = useCallback(async () => {
    try {
      // Try to refresh the token
      const { success, data } = await silentTokenRefresh();
      
      if (success && data?.user) {
        setUser(data.user);
      }
      
      return success;
    } catch (error) {
      console.error("🔴 Token refresh failed:", error);
      return false;
    }
  }, []);

  // Fetch User Profile
  const fetchUserProfile = useCallback(async (skipRefresh = false) => {
    try {
      setLoading(true);

      // Try to fetch user profile
      try {
        // Add cache-busting parameter to prevent caching
        const timestamp = new Date().getTime();
        const res = await axiosInstance.get(`/profile/?_=${timestamp}`);
        
        // Store user data in state and localStorage
        setUser(res.data);
        localStorage.setItem('userData', JSON.stringify(res.data));
        
        console.log("✅ User profile fetched successfully:", res.data);
        return true;
      } catch (error) {
        // If we get a 401/403 and haven't tried refreshing yet
        if (!skipRefresh && (error.response?.status === 401 || error.response?.status === 403)) {
          console.log("🔄 Token expired, attempting refresh...");
          const refreshSuccess = await refreshTokenIfNeeded();
          
          if (refreshSuccess) {
            // Try fetching the profile again after successful refresh
            console.log("🔄 Retrying profile fetch after token refresh");
            return fetchUserProfile(true); // Skip refresh on retry to prevent loops
          } else {
            console.error("🔴 Token refresh failed, cannot fetch profile");
            setUser(null);
            localStorage.removeItem('userData');
            return false;
          }
        } else {
          console.error("🔴 Error fetching user profile:", error);
          setUser(null);
          localStorage.removeItem('userData');
          return false;
        }
      }
    } catch (error) {
      console.error("🔴 Unexpected error in fetchUserProfile:", error);
      setUser(null);
      localStorage.removeItem('userData');
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshTokenIfNeeded]);

  // Email/Password Login
  const login = async (email, password) => {
    // Ensure CSRF token is loaded
    await fetchCSRFToken();

    try {
      // Make login request
      const res = await axiosInstance.post("/login/", { email, password });
      
      // Log success
      console.log("✅ Login successful:", res.data);
      
      // Set user state immediately for UI responsiveness
      setUser(res.data);
      
      // Store user data in localStorage
      localStorage.setItem('userData', JSON.stringify(res.data));
      
      return { 
        success: true, 
        message: res.data.message || "Login successful", 
        role: res.data.role 
      };
    } catch (error) {
      console.error("🔴 Login error:", error);
      return { 
        success: false, 
        message: error?.response?.data?.error || "Invalid credentials" 
      };
    }
  };

  // Google SSO Login
  const googleLogin = async (idToken) => {
    // Ensure CSRF token is loaded
    await fetchCSRFToken();

    try {
      // Make Google login request
      const res = await axiosInstance.post("/login/google/", { id_token: idToken });
      
      // Log success
      console.log("✅ Google login successful:", res.data);
      
      // Set user state
      setUser(res.data);
      
      // Store user data in localStorage
      localStorage.setItem('userData', JSON.stringify(res.data));
      
      return { 
        success: true, 
        message: res.data.message || "Login successful", 
        role: res.data.role 
      };
    } catch (error) {
      console.error("🔴 Google login error:", error);
      return { 
        success: false, 
        message: error?.response?.data?.error || "Google Login failed" 
      };
    }
  };

  // Patient Registration
  const register = async (data) => {
    // Ensure CSRF token is loaded
    await fetchCSRFToken();

    if (data.password !== data.confirm_password) {
      return { success: false, message: "Passwords do not match" };
    }

    try {
      const res = await axiosInstance.post("/register/", data);
      return { success: true, message: res.data.message || "Registration successful" };
    } catch (error) {
      console.error("🔴 Register error:", error);
      return { 
        success: false, 
        message: error?.response?.data?.error || "Registration failed" 
      };
    }
  };

  // Initialize authentication state
  const initializeAuth = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    
    try {
      // First load CSRF token
      await fetchCSRFToken();
      
      // Check for existing user data in localStorage
      const savedUserData = localStorage.getItem('userData');
      if (savedUserData) {
        try {
          const parsedUser = JSON.parse(savedUserData);
          setUser(parsedUser);
          console.log("Restored user session from localStorage:", parsedUser);
        } catch (err) {
          console.error("Error parsing saved user data:", err);
          localStorage.removeItem('userData');
        }
      }
      
      // Try to refresh token and fetch the latest user profile
      // This will update our state if successful
      await refreshTokenIfNeeded();
      await fetchUserProfile(true); // Skip another refresh since we just tried
    } catch (err) {
      console.error("Auth initialization error:", err);
      setAuthError(err.message || "Failed to initialize authentication");
      setUser(null);
      localStorage.removeItem('userData');
    } finally {
      setLoading(false);
      setAuthInitialized(true);
    }
  }, [fetchUserProfile, refreshTokenIfNeeded]);

  // Load Auth on App Start
  useEffect(() => {
    console.log("🚀 AuthProvider initializing...");
    initializeAuth();
    
    // Set up a refresh interval (every 50 minutes)
    const refreshInterval = setInterval(() => {
      refreshTokenIfNeeded();
    }, 50 * 60 * 1000); // 50 minutes
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [initializeAuth, refreshTokenIfNeeded]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      googleLogin, 
      register, 
      logout,
      authInitialized,
      authError,
      refreshUser: fetchUserProfile,
      refreshToken: refreshTokenIfNeeded
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;