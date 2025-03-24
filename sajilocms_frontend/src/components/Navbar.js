// src/components/Navbar.js
import React, { useContext, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Close menus when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Define navigation links based on user role
  const getNavLinks = () => {
    if (!user) {
      return [
        { label: "Login", path: "/login" },
        { label: "Register", path: "/register" },
      ];
    }

    const links = [{ label: "Home", path: "/" }];
    
    switch (user.role?.toUpperCase()) {
      case "ADMIN":
        links.push({ label: "Admin Dashboard", path: "/admin" });
        break;
      case "DOCTOR":
        links.push({ label: "Doctor Dashboard", path: "/doctor" });
        break;
      case "RECEPTIONIST":
        links.push({ label: "Receptionist Dashboard", path: "/receptionist" });
        break;
      case "PHARMACIST":
        links.push({ label: "Pharmacist Dashboard", path: "/pharmacist" });
        break;
      case "PATIENT":
        links.push({ label: "Patient Dashboard", path: "/patient" });
        links.push({ label: "View Doctors", path: "/doctors" });
        break;
      default:
        break;
    }
    return links;
  };

  const navLinks = getNavLinks();

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-white font-bold text-xl">
                Sajilo CMS
              </Link>
            </div>
            
            {/* Desktop menu */}
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === link.path
                      ? "text-white bg-blue-700"
                      : "text-blue-100 hover:bg-blue-700 hover:text-white"
                  } transition duration-150 ease-in-out`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          
          {/* User menu (desktop) */}
          <div className="hidden md:flex md:items-center">
            {user ? (
              <div className="ml-3 relative">
                <div>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center max-w-xs text-sm rounded-full text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-800 focus:ring-white"
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-semibold">
                      {user.first_name ? user.first_name.charAt(0) : user.email.charAt(0)}
                    </div>
                    <span className="ml-2">{user.first_name || user.email}</span>
                    <svg className={`ml-1 h-5 w-5 transform ${isProfileOpen ? 'rotate-180' : 'rotate-0'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                {isProfileOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="block px-4 py-2 text-xs text-gray-500">
                      {user.role} Account
                    </div>
                    <div className="border-t border-gray-100"></div>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
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
            ) : (
              <div className="space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-400"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-blue-500 bg-white rounded-md hover:bg-gray-100"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-blue-100 hover:text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === link.path
                    ? "text-white bg-blue-700"
                    : "text-blue-100 hover:bg-blue-700 hover:text-white"
                } transition duration-150 ease-in-out`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          
          {user && (
            <div className="pt-4 pb-3 border-t border-blue-700">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-semibold">
                    {user.first_name ? user.first_name.charAt(0) : user.email.charAt(0)}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-white">{user.first_name} {user.last_name}</div>
                  <div className="text-sm font-medium text-blue-100">{user.email}</div>
                  <div className="text-sm font-medium text-blue-200">Role: {user.role}</div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium text-blue-100 hover:bg-blue-700 hover:text-white"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-blue-100 hover:bg-blue-700 hover:text-white"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
          
          {!user && (
            <div className="pt-4 pb-3 border-t border-blue-700">
              <div className="flex flex-col px-5 space-y-2">
                <Link
                  to="/login"
                  className="block w-full text-center px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-400"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block w-full text-center px-4 py-2 text-sm font-medium text-blue-500 bg-white rounded-md hover:bg-gray-100"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;