import React, { createContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import axiosInstance, { fetchCSRFToken, silentTokenRefresh } from "../api/axiosInstance";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [authError, setAuthError] = useState(null);
  const location = useLocation();

  // Clear user session and localStorage
  const clearUserSession = useCallback(() => {
    setUser(null);
    localStorage.removeItem('userData');
    localStorage.removeItem('lastTokenRefresh');
    console.log("User session cleared");
  }, []);

  // Logout Function
  const logout = useCallback(async (redirect = true) => {
    try {
      console.log("Logging out user...");
      try {
        await axiosInstance.post("/logout/");
        console.log("Logout endpoint success");
      } catch (error) {
        console.error("Logout endpoint failed:", error);
      }
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

  // Refresh token if needed
  const refreshTokenIfNeeded = useCallback(async () => {
    try {
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
      try {
        const timestamp = new Date().getTime();
        const res = await axiosInstance.get(`/profile/?_=${timestamp}`);
        setUser(res.data);
        localStorage.setItem('userData', JSON.stringify(res.data));
        console.log("✅ User profile fetched successfully:", res.data);
        return true;
      } catch (error) {
        if (!skipRefresh && (error.response?.status === 401 || error.response?.status === 403)) {
          console.log("🔄 Token expired, attempting refresh...");
          const refreshSuccess = await refreshTokenIfNeeded();
          if (refreshSuccess) {
            console.log("🔄 Retrying profile fetch after token refresh");
            return fetchUserProfile(true);
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
    await fetchCSRFToken();
    try {
      const res = await axiosInstance.post("/login/", { email, password });
      console.log("✅ Login successful:", res.data);
      setUser(res.data);
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
    await fetchCSRFToken();
    try {
      const res = await axiosInstance.post("/login/google/", { id_token: idToken });
      console.log("✅ Google login successful:", res.data);
      setUser(res.data);
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
    // Define public routes that don't require authentication
    const publicRoutes = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/unauthorized",
      "/doctors",
      "/payment-success",
      "/payment-cancel",
    ];

    const isResetPasswordRoute = location.pathname.startsWith("/reset-password");
    const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route)) || isResetPasswordRoute;

    if (isPublicRoute) {
      console.log("On a public route, skipping authentication check:", location.pathname);
      setLoading(false);
      setAuthInitialized(true);
      return;
    }

    setLoading(true);
    setAuthError(null);
    
    try {
      await fetchCSRFToken();
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
      await refreshTokenIfNeeded();
      await fetchUserProfile(true);
    } catch (err) {
      console.error("Auth initialization error:", err);
      setAuthError(err.message || "Failed to initialize authentication");
      setUser(null);
      localStorage.removeItem('userData');
    } finally {
      setLoading(false);
      setAuthInitialized(true);
    }
  }, [fetchUserProfile, refreshTokenIfNeeded, location]);

  // Load Auth on App Start
  useEffect(() => {
    console.log("🚀 AuthProvider initializing...");
    initializeAuth();
    
    const refreshInterval = setInterval(() => {
      refreshTokenIfNeeded();
    }, 50 * 60 * 1000);
    
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