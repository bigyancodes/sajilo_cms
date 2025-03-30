// src/pages/dashboards/DoctorDashboard.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import DoctorAppointments from "../../components/appointments/DoctorAppointments";
import AvailabilityManagement from "../../components/appointments/AvailabilityManagement";

const DoctorDashboard = () => {
  const { user } = React.useContext(AuthContext);
  const [activeSection, setActiveSection] = useState('appointments');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
        <p className="mt-2 text-lg text-gray-600">
          Welcome, Dr. {user.first_name} {user.last_name}
        </p>
      </div>
      
      <div className="mb-8">
        <div className="sm:hidden">
          <label htmlFor="section-select" className="sr-only">
            Select a section
          </label>
          <select
            id="section-select"
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="appointments">Appointments</option>
            <option value="availability">Manage Availability</option>
          </select>
        </div>
        
        <div className="hidden sm:block">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeSection === 'appointments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
                onClick={() => setActiveSection('appointments')}
              >
                Appointments
              </button>
              <button
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeSection === 'availability'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
                onClick={() => setActiveSection('availability')}
              >
                Manage Availability
              </button>
            </nav>
          </div>
        </div>
      </div>
      
      {activeSection === 'appointments' ? (
        <DoctorAppointments />
      ) : (
        <AvailabilityManagement />
      )}
    </div>
  );
};

export default DoctorDashboard;