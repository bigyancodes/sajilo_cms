// src/pages/auth/UnauthorizedPage.js
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const UnauthorizedPage = () => {
  const { user } = useContext(AuthContext);
  
  // Determine which page link to show based on user role
  const getHomeLink = () => {
    if (!user) return "/login";
    
    switch (user.role?.toUpperCase()) {
      case "ADMIN":
        return "/admin";
      case "DOCTOR":
        return "/doctor";
      case "RECEPTIONIST":
        return "/receptionist"; 
      case "PHARMACIST":
        return "/pharmacist";
      case "PATIENT":
        return "/patient";
      default:
        return "/";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full text-center">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-red-600 py-8">
            <svg className="h-16 w-16 text-white mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page. This area is restricted to authorized users only.
            </p>
            
            <Link 
              to={getHomeLink()} 
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition duration-150 ease-in-out"
            >
              Return to Dashboard
            </Link>
            
            <div className="mt-6 text-gray-500 text-sm">
              If you believe this is an error, please contact the system administrator for assistance.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;