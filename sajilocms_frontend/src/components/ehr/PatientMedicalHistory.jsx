// src/components/ehr/PatientMedicalHistory.jsx
import React, { useState, useEffect } from "react";
import { fetchPatientMedicalHistory } from "../../api/ehrService";
import MedicalRecordView from "./MedicalRecordView";

const PatientMedicalHistory = ({ patientId, patientName }) => {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    const loadMedicalHistory = async () => {
      if (!patientId) {
        setError("Patient ID is missing. Cannot load medical history.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const response = await fetchPatientMedicalHistory(patientId);
        if (Array.isArray(response.data)) {
          setMedicalRecords(response.data);
        } else {
          throw new Error("Invalid data format received from server");
        }
      } catch (err) {
        console.error("Failed to load patient medical history:", err);
        setError(err.response?.data?.error || "Failed to load patient's medical history. Please try again.");
        setMedicalRecords([]);
      } finally {
        setLoading(false);
      }
    };
    loadMedicalHistory();
  }, [patientId]);

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
  };

  const handleCloseRecord = () => {
    setSelectedRecord(null);
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-blue-600">Loading patient history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-8 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200">Retry</button>
      </div>
    );
  }

  if (selectedRecord) {
    return (
      <div className="space-y-6">
        <button onClick={handleCloseRecord} className="flex items-center text-blue-600 hover:text-blue-800">
          <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Medical History
        </button>
        <MedicalRecordView
          recordId={selectedRecord.id}
          onClose={handleCloseRecord}
          readOnly={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white">
          <h2 className="text-xl font-bold">Medical History</h2>
          <p className="mt-1 text-indigo-100">
            {patientName || `Patient ID: ${patientId}`}
          </p>
        </div>
        <div className="p-6">
          {medicalRecords.length === 0 ? (
            <div className="text-center py-8">
              <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No medical records found for this patient</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diagnosis</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow-up</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {medicalRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(record.appointment_time).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.doctor_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.diagnosis ? (
                          <span className="line-clamp-1">{record.diagnosis}</span>
                        ) : (
                          <span className="text-gray-500 italic">Not recorded</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.previous_record_info ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Follow-up</span>
                        ) : record.follow_up_records && record.follow_up_records.length > 0 ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Has Follow-ups: {record.follow_up_records.length}</span>
                        ) : (
                          <span className="text-gray-500 italic">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.is_locked ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.is_locked ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleViewRecord(record)} className="text-indigo-600 hover:text-indigo-900">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientMedicalHistory;