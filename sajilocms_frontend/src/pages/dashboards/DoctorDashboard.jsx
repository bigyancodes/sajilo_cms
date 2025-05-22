// src/components/DoctorDashboard.js
import React, { useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import DoctorAppointments from "../../components/appointments/DoctorAppointments";
import AvailabilityManagement from "../../components/appointments/AvailabilityManagement";
import DoctorEHRDashboard from "../../components/ehr/DoctorEHRDashboard";
import CommunicationList from "../../components/communication/CommunicationList";

const DoctorDashboard = () => {
  const { user } = React.useContext(AuthContext);
  // Initialize activeSection from localStorage, default to "appointments" if not found
  const [activeSection, setActiveSection] = useState(() => {
    return localStorage.getItem("activeSection") || "appointments";
  });

  // Update localStorage whenever activeSection changes
  useEffect(() => {
    localStorage.setItem("activeSection", activeSection);
  }, [activeSection]);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-blue-600 text-white overflow-y-auto">
        <nav className="mt-8">
          <ul>
            <li>
              <button
                onClick={() => setActiveSection("appointments")}
                className={`flex items-center w-full px-6 py-3 text-left ${
                  activeSection === "appointments"
                    ? "bg-blue-700 border-l-4 border-white"
                    : "hover:bg-blue-700"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Appointments
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("medical-records")}
                className={`flex items-center w-full px-6 py-3 text-left ${
                  activeSection === "medical-records"
                    ? "bg-blue-700 border-l-4 border-white"
                    : "hover:bg-blue-700"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Medical Records
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("availability")}
                className={`flex items-center w-full px-6 py-3 text-left ${
                  activeSection === "availability"
                    ? "bg-blue-700 border-l-4 border-white"
                    : "hover:bg-blue-700"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Manage Availability
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("communication")}
                className={`flex items-center w-full px-6 py-3 text-left ${
                  activeSection === "communication"
                    ? "bg-blue-700 border-l-4 border-white"
                    : "hover:bg-blue-700"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                Communication
              </button>
            </li>
            <li>
              <a
                href="/profile"
                className="flex items-center w-full px-6 py-3 text-left hover:bg-blue-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                My Profile
              </a>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 ml-64 mt-16 overflow-y-auto h-[calc(100vh-4rem)]">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
            <p className="mt-2 text-lg text-gray-600">
              Welcome, Dr. {user.first_name} {user.last_name}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            {activeSection === "appointments" && <DoctorAppointments />}
            {activeSection === "medical-records" && <DoctorEHRDashboard />}
            {activeSection === "availability" && <AvailabilityManagement />}
            {activeSection === "communication" && (
              <CommunicationList userRole="DOCTOR" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;