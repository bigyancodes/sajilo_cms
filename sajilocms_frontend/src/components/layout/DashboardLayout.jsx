// src/components/layout/DashboardLayout.jsx
import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import Navbar from "../Navbar"; // Import the Navbar component

const DashboardLayout = ({ children }) => {
  const { user } = useContext(AuthContext);
  
  // Navigation items
  const navItems = [
    { id: "appointments", label: "Appointments", icon: "calendar", path: "/patient" },
    { id: "medical-records", label: "Medical Records", icon: "document", path: "/patient/medical-records" },
    { id: "communication", label: "Communication", icon: "chat", path: "/patient/communication" },
    { id: "ai-assistant", label: "AI Assistant", icon: "lightning", path: "/patient/ai-assistant" },
    { id: "pharmacy", label: "Pharmacy", icon: "pill", path: "/patient/pharmacy" }
  ];

  // Icon components
  const icons = {
    calendar: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    document: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    chat: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    lightning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    pill: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  // Only show the sidebar for patient role
  if (user?.role !== "PATIENT") {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50">
          <div className="py-6 px-8 mt-8">
            {children}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar at the top */}
      <Navbar />
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 bg-blue-600 flex-shrink-0">
          {/* Menu items */}
          <nav className="pt-6">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center w-full px-6 py-3 text-left ${
                  window.location.pathname === item.path
                    ? "bg-white text-blue-600 font-medium"
                    : "text-white hover:bg-blue-700"
                }`}
              >
                <span className="mr-3">{icons[item.icon]}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Settings at bottom */}
          <div className="mt-auto px-6 pb-6">
            <Link to="/settings" className="flex items-center text-white hover:text-blue-100 py-3">
              {icons.settings}
              <span className="ml-3">Settings</span>
            </Link>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="mt-8 py-6 px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;