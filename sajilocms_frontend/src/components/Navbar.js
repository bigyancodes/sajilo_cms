// src/components/Navbar.js
import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    setIsProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getNavLinks = () => {
    if (!user) return [];

    const links = [{ label: "Home", path: "/" }];
    
    switch (user.role?.toUpperCase()) {
      case "PATIENT":
        links.push({ label: "Patient Dashboard", path: "/patient" });
        links.push({ label: "View Doctors", path: "/doctors" });
        break;
      case "DOCTOR":
        links.push({ label: "Doctor Dashboard", path: "/doctor" });
        break;
      case "ADMIN":
        links.push({ label: "Admin Dashboard", path: "/admin" });
        break;
      case "RECEPTIONIST":
        links.push({ label: "Receptionist Dashboard", path: "/receptionist" });
        break;
      case "PHARMACIST":
        links.push({ label: "Pharmacist Dashboard", path: "/pharmacist" });
        break;
      default:
        break;
    }
    return links;
  };

  const navLinks = getNavLinks();

  return (
    <nav className="fixed top-0 w-full bg-blue-600 h-16 flex items-center z-10">
      <div className="w-full px-4 md:px-8 flex justify-between items-center">
        <div className="flex-shrink-0">
          <Link to="/" className="text-white font-bold text-xl">
            Sajilo CMS
          </Link>
        </div>
        
        <div className="hidden md:flex space-x-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === link.path
                  ? "text-blue-600 bg-white"
                  : "text-white hover:bg-blue-700"
              } transition duration-150 ease-in-out`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        
        {user && (
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center text-white focus:outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-white text-blue-600 flex items-center justify-center font-semibold">
                {user.first_name ? user.first_name.charAt(0) : "B"}
              </div>
              <span className="ml-2 mr-1 hidden md:inline">{user.first_name || "Bigyan"}</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
                  clipRule="evenodd"
                />
              </svg>
            </button>
            
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                <div className="px-4 py-2 text-xs text-gray-500">
                  {user.role} Account
                </div>
                <div className="border-t border-gray-100"></div>
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Your Profile
                </Link>
                <Link
                  to="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
        
        {!user && (
          <div className="flex items-center space-x-2">
            <Link
              to="/login"
              className="px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 rounded-md"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-white hover:bg-gray-100 rounded-md"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;