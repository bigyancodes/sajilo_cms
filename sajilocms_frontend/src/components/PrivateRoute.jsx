// src/components/PrivateRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children, requiredRoles = [] }) => {
  const { user, isAuthenticated } = useContext(AuthContext);

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check if user has required role (if specified)
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    // Redirect based on user role
    switch (user.role) {
      case 'ADMIN':
        return <Navigate to="/admin" />;
      case 'PATIENT':
        return <Navigate to="/patient" />;
      case 'DOCTOR':
        return <Navigate to="/doctor" />;
      case 'PHARMACIST':
        return <Navigate to="/pharmacist" />;
      case 'RECEPTIONIST':
        return <Navigate to="/receptionist" />;
      default:
        return <Navigate to="/login" />;
    }
  }

  // If all checks pass, render the component
  return children;
};

export default PrivateRoute;
