// src/components/ehr/AdminEHRDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { fetchMedicalRecordAuditLogs, fetchMedicalRecords } from "../../api/ehrService";
import MedicalRecordView from "./MedicalRecordView";
import PatientMedicalHistory from "./PatientMedicalHistory";

const AdminEHRDashboard = () => {
  const [activeTab, setActiveTab] = useState("records");
  const [records, setRecords] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // State for date filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // State for handling medical record view
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // State for handling patient history view
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // Define load functions first with useCallback to avoid the "used before defined" error
  const loadMedicalRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await fetchMedicalRecords(params);
      setRecords(response.data);
    } catch (err) {
      console.error("Failed to load medical records:", err);
      setError("Failed to load medical records. Please try again.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);
  
  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await fetchMedicalRecordAuditLogs(params);
      setAuditLogs(response.data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setError("Failed to load audit logs. Please try again.");
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);
  
  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "records") {
      loadMedicalRecords();
    } else if (activeTab === "audit") {
      loadAuditLogs();
    }
  }, [activeTab, loadMedicalRecords, loadAuditLogs]);
  
  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setSelectedPatient(null);
  };
  
  const handleCloseRecord = () => {
    setSelectedRecord(null);
  };
  
  const handleViewPatientHistory = (patient) => {
    setSelectedPatient(patient);
    setSelectedRecord(null);
  };
  
  const handleClosePatientHistory = () => {
    setSelectedPatient(null);
  };
  
  const applyFilters = () => {
    if (activeTab === "records") {
      loadMedicalRecords();
    } else if (activeTab === "audit") {
      loadAuditLogs();
    }
  };
  
  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    
    // Load data without filters
    if (activeTab === "records") {
      loadMedicalRecords();
    } else if (activeTab === "audit") {
      loadAuditLogs();
    }
  };
  
  // Render medical record view if a record is selected
  if (selectedRecord) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleCloseRecord}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to EHR Management
        </button>
        
        <MedicalRecordView
          recordId={selectedRecord.id}
          onClose={handleCloseRecord}
          readOnly={true}
        />
      </div>
    );
  }
  
  // Render patient medical history if a patient is selected
  if (selectedPatient) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleClosePatientHistory}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to EHR Management
        </button>
        
        <PatientMedicalHistory
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
        />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">EHR Management</h2>
        
        <div className="mt-4 sm:mt-0">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setActiveTab("records")}
              className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                activeTab === "records"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              Medical Records
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                activeTab === "audit"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              Audit Logs
            </button>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="date_from" className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              id="date_from"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="date_to" className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              id="date_to"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Clear Filters
          </button>
          
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="w-full h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
          <button 
            className="ml-2 text-red-800 underline" 
            onClick={() => setError('')}
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Tab Content */}
      {!loading && !error && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {/* Medical Records Tab */}
          {activeTab === "records" && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Records</h3>
              
              {records.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">No medical records found for the selected filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Doctor
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.appointment_time).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.patient_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.doctor_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.is_locked 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {record.is_locked ? 'Completed' : 'In Progress'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleViewRecord(record)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                            >
                              View
                            </button>
                            
                            <button
                              onClick={() => handleViewPatientHistory({
                                id: record.appointment.patient,
                                name: record.patient_name
                              })}
                              className="text-green-600 hover:text-green-900"
                            >
                              Patient History
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* Audit Logs Tab */}
          {activeTab === "audit" && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Audit Logs</h3>
              
              {auditLogs.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-4V3m0 0v2m0-2h2m-2 0H9" />
                  </svg>
                  <p className="text-gray-500">No audit logs found for the selected filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Field
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.action === 'CREATE' 
                                ? 'bg-green-100 text-green-800' 
                                : log.action === 'UPDATE'
                                ? 'bg-blue-100 text-blue-800'
                                : log.action === 'VIEW'
                                ? 'bg-gray-100 text-gray-800'
                                : log.action === 'EXPORT'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {log.action_display}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.field_modified || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.performed_by_name || "-"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleViewRecord(log.medical_record)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View Record
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminEHRDashboard;