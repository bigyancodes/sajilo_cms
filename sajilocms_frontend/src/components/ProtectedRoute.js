// src/components/ProtectedRoute.js
import React, { useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading, authInitialized, refreshUser, refreshToken } = useContext(AuthContext);
  const location = useLocation();
  const [retryCount, setRetryCount] = useState(0);
  const [finalLoading, setFinalLoading] = useState(true);
  const [authState, setAuthState] = useState({
    authenticated: false,
    authorized: false,
    attempted: false
  });

  // Effect to handle token refresh and authentication
  useEffect(() => {
    let isMounted = true;
    const MAX_RETRIES = 2;
    
    const attemptAuth = async () => {
      // Skip if we've already successfully authenticated
      if (user && authState.authenticated) {
        if (isMounted) {
          setFinalLoading(false);
        }
        return;
      }

      // If the user is null but we've already tried MAX_RETRIES times, stop trying
      if (!user && authState.attempted && retryCount >= MAX_RETRIES) {
        if (isMounted) {
          setFinalLoading(false);
        }
        return;
      }

      // If not initialized or still loading from parent context, wait
      if (!authInitialized || loading) {
        console.log("Auth not initialized yet or still loading, waiting...");
        return;
      }

      console.log("Attempting authentication, retry count:", retryCount);
      
      // Set that we've attempted authentication
      if (isMounted) {
        setAuthState(prev => ({ ...prev, attempted: true }));
      }

      // If user is already set, check roles
      if (user) {
        console.log("User already authenticated:", user.email);
        if (isMounted) {
          const userRole = user.role?.toUpperCase();
          const isAuthorized = roles.length === 0 || roles.includes(userRole);
          
          setAuthState({
            authenticated: true,
            authorized: isAuthorized,
            attempted: true
          });
          setFinalLoading(false);
        }
        return;
      }

      // Check for saved user data in localStorage as a backup
      const savedUserData = localStorage.getItem('userData');
      if (savedUserData) {
        try {
          const parsedUser = JSON.parse(savedUserData);
          const userRole = parsedUser.role?.toUpperCase();
          const isAuthorized = roles.length === 0 || roles.includes(userRole);
          
          if (isMounted) {
            setAuthState({
              authenticated: true,
              authorized: isAuthorized,
              attempted: true
            });
            setFinalLoading(false);
          }
          return;
        } catch (err) {
          console.error("Error parsing saved user data:", err);
          localStorage.removeItem('userData');
        }
      }

      try {
        // No user, try to refresh token first
        console.log("No user found, attempting token refresh...");
        const refreshResult = await refreshToken();
        
        if (refreshResult) {
          // If token refresh succeeded, try getting user profile
          console.log("Token refresh succeeded, fetching user profile...");
          const profileResult = await refreshUser();
          
          if (profileResult && isMounted) {
            console.log("User profile fetched successfully after refresh");
            // We need to get the updated user from localStorage since the context might not be updated yet
            const updatedUserData = localStorage.getItem('userData');
            if (updatedUserData) {
              try {
                const parsedUser = JSON.parse(updatedUserData);
                const userRole = parsedUser.role?.toUpperCase();
                const isAuthorized = roles.length === 0 || roles.includes(userRole);
                
                setAuthState({
                  authenticated: true,
                  authorized: isAuthorized,
                  attempted: true
                });
              } catch (err) {
                console.error("Error parsing updated user data:", err);
              }
            }
          } else if (isMounted) {
            console.log("Failed to fetch user profile after token refresh");
            setRetryCount(prev => prev + 1);
          }
        } else if (isMounted) {
          console.log("Token refresh failed, incrementing retry count");
          setRetryCount(prev => prev + 1);
        }
      } catch (error) {
        console.error("Authentication error:", error);
        if (isMounted) {
          setRetryCount(prev => prev + 1);
        }
      } finally {
        if (isMounted) {
          setFinalLoading(false);
        }
      }
    };

    // Run the authentication attempt
    attemptAuth();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [
    user, 
    loading, 
    authInitialized, 
    retryCount, 
    refreshUser, 
    refreshToken, 
    roles, 
    authState.authenticated,
    authState.attempted
  ]);

  // Show loading state
  if (loading || finalLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Loading...</h2>
        <p className="text-gray-500 mt-2">Please wait while we verify your access</p>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!authState.authenticated && !user) {
    console.log("User not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated but not authorized for this route
  if (authState.authenticated && !authState.authorized) {
    console.log("User authenticated but not authorized for this route");
    return <Navigate to="/unauthorized" replace />;
  }

  // Render the protected content
  console.log("Rendering protected content");
  return children;
};

export default ProtectedRoute;