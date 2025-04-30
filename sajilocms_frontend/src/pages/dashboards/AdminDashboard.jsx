// src/pages/dashboards/AdminDashboard.jsx
import React, { useState } from "react";
import RegisterStaff from "../../components/RegisterStaff";
import UserList from "../../components/UserList";
import AdminAppointments from "../../components/appointments/AdminAppointments";
import TimeOffManagement from "../../components/appointments/TimeOffManagement";
import AdminEHRDashboard from "../../components/ehr/AdminEHRDashboard";
import { verifyStaff } from "../../api/axiosInstance";
import ReportsPage from "../pharmacy/ReportsPage";
import AuditLogsPage from "../pharmacy/AuditLogsPage";

const AdminDashboard = () => {
  const [refresh, setRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleVerify = async (staffId) => {
    try {
      await verifyStaff(staffId);
      setRefresh(!refresh);
      alert("Staff verified successfully!");
    } catch (err) {
      alert("Failed to verify staff: " + (err.response?.data?.error || "Unknown error"));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>
      
      {/* Admin Navigation Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 0
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab(0)}
          >
            Staff Management
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 1
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab(1)}
          >
            Appointment Management
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 2
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab(2)}
          >
            Medical Records
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 3
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab(3)}
          >
            Time Off Management
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 4
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab(4)}
          >
            Pharmacy Reports
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 5
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab(5)}
          >
            Pharmacy Audit Logs
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 0 && (
        <div>
          <RegisterStaff onRegisterSuccess={() => setRefresh(!refresh)} />
          <UserList onVerify={handleVerify} refresh={refresh} />
        </div>
      )}
      
      {activeTab === 1 && (
        <AdminAppointments />
      )}
      
      {activeTab === 2 && (
        <AdminEHRDashboard />
      )}
      
      {activeTab === 3 && (
        <TimeOffManagement />
      )}

      {activeTab === 4 && (
        <ReportsPage />
      )}

      {activeTab === 5 && (
        <AuditLogsPage />
      )}
    </div>
  );
};

export default AdminDashboard;