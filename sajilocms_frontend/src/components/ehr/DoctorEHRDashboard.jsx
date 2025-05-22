// src/components/ehr/DoctorEHRDashboard.jsx
import React, { useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext";
import { fetchMedicalRecords } from "../../api/ehrService";
import { fetchDoctorAppointments } from "../../api/appointmentService";
import MedicalRecordView from "./MedicalRecordView";
import MedicalRecordForm from "./MedicalRecordForm";
import PatientMedicalHistory from "./PatientMedicalHistory";

const DoctorEHRDashboard = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("recent");
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      let response;
      if (activeTab === "recent") {
        response = await fetchMedicalRecords({ doctor_id: user.id });
        setRecords(response.data);
      } else if (activeTab === "today") {
        // Fetch today's appointments specifically
        response = await fetchDoctorAppointments("today");
        setAppointments(response.data);
      } else if (activeTab === "pending") {
        response = await fetchDoctorAppointments("upcoming", "CONFIRMED");
        // Filter out appointments with existing medical records (regardless of record status)
        const filteredAppointments = response.data.filter(
          (appointment) => !appointment.medical_record
        );
        setAppointments(filteredAppointments);
        console.log("Pending appointments (after filtering):", filteredAppointments.length);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, user.id]);

  useEffect(() => {
    loadData();
  }, [activeTab, loadData]);

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setIsEditing(false);
    setSelectedPatient(null);
  };

  const handleEditRecord = (record) => {
    setSelectedRecord(record);
    setIsEditing(true);
    setSelectedPatient(null);
  };

  const handleCreateRecord = (appointment) => {
    setSelectedRecord({ 
      appointment: appointment.id,
      patient_id: appointment.patient_id || appointment.patient
    });
    setIsEditing(true);
    setSelectedPatient(null);
  };

  const handleCloseRecord = () => {
    setSelectedRecord(null);
    setIsEditing(false);
    loadData();
  };

  const handleSaveRecord = (savedRecord) => {
    setSelectedRecord(savedRecord);
    setIsEditing(false);
    // Force a refresh of the data to reflect any status changes
    loadData();
  };

  const handleViewPatientHistory = (patient) => {
    const patientId = patient.id || patient.patient_id || patient.patient;
    if (!patientId) {
      alert("Cannot view patient history: Missing patient ID");
      return;
    }
    setSelectedPatient({ id: patientId, name: patient.name || patient.patient_name });
    setSelectedRecord(null);
    setIsEditing(false);
  };

  const handleClosePatientHistory = () => {
    setSelectedPatient(null);
  };

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
          Back to Dashboard
        </button>
        {isEditing ? (
          <MedicalRecordForm
            record={selectedRecord}
            appointmentId={selectedRecord.appointment?.id || selectedRecord.appointment}
            patientId={selectedRecord.patient_id}
            onSave={handleSaveRecord}
            onCancel={handleCloseRecord}
          />
        ) : (
          <MedicalRecordView
            recordId={selectedRecord.id}
            onClose={handleCloseRecord}
            onEdit={handleEditRecord}
          />
        )}
      </div>
    );
  }

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
          Back to Dashboard
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Electronic Health Records</h2>
        <div className="mt-4 sm:mt-0">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setActiveTab("recent")}
              className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                activeTab === "recent"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              Recent Records
            </button>
            <button
              onClick={() => setActiveTab("today")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "today"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-t border-b border-gray-300"
              }`}
            >
              Today's Appointments
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                activeTab === "pending"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              Pending Records
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="w-full h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

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

      {!loading && !error && (
        <>
          {activeTab === "recent" && (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Medical Records</h3>
                {records.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">No recent medical records found</p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diagnosis</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {records.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(record.appointment_time).toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.patient_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.diagnosis ? (
                                <span className="line-clamp-1">{record.diagnosis}</span>
                              ) : (
                                <span className="text-gray-500 italic">Not recorded</span>
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
                              <button onClick={() => handleViewRecord(record)} className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                              {!record.is_locked && (
                                <button onClick={() => handleEditRecord(record)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                              )}
                              <button onClick={() => handleViewPatientHistory({ id: record.patient_id, name: record.patient_name })} className="text-green-600 hover:text-green-900">History</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "today" && (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Appointments</h3>
                {appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500">No appointments scheduled for today</p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medical Record</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {appointments.map((appointment) => (
                          <tr key={appointment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(appointment.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.patient_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                appointment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {appointment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.medical_record ? (
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  appointment.medical_record.is_locked ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {appointment.medical_record.is_locked ? 'Completed' : 'In Progress'}
                                </span>
                              ) : (
                                <span className="text-gray-500 italic">Not created</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {appointment.medical_record ? (
                                <>
                                  <button onClick={() => handleViewRecord(appointment.medical_record)} className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                                  {!appointment.medical_record.is_locked && (
                                    <button onClick={() => handleEditRecord(appointment.medical_record)} className="text-blue-600 hover:text-blue-900">Edit</button>
                                  )}
                                </>
                              ) : (
                                appointment.status === 'CONFIRMED' ? (
                                  <button onClick={() => handleCreateRecord(appointment)} className="text-green-600 hover:text-green-900">Create Record</button>
                                ) : (
                                  <span className="text-gray-400">
                                    {appointment.status === 'CANCELLED' || appointment.status === 'MISSED' ? 
                                      `Cannot create record for ${appointment.status.toLowerCase()} appointment` : 
                                      "Not Available"}
                                  </span>
                                )
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "pending" && (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Appointments Requiring Medical Records</h3>
                {appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500">No appointments requiring medical records</p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {appointments.map((appointment) => (
                          <tr key={appointment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(appointment.appointment_time).toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.patient_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                appointment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {appointment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {appointment.medical_record ? (
                                <>
                                  <button onClick={() => handleViewRecord(appointment.medical_record)} className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                                  {!appointment.medical_record.is_locked && (
                                    <button onClick={() => handleEditRecord(appointment.medical_record)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                                  )}
                                </>
                              ) : (
                                appointment.status === 'CONFIRMED' ? (
                                  <button onClick={() => handleCreateRecord(appointment)} className="text-green-600 hover:text-green-900 mr-3">Create Record</button>
                                ) : (
                                  <span className="text-gray-400 mr-3">
                                    {appointment.status === 'CANCELLED' || appointment.status === 'MISSED' ? 
                                      `Cannot create record for ${appointment.status.toLowerCase()} appointment` : 
                                      "Not Available"}
                                  </span>
                                )
                              )}
                              <button onClick={() => handleViewPatientHistory({ id: appointment.patient_id || appointment.patient, name: appointment.patient_name })} className="text-blue-600 hover:text-blue-900">View History</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DoctorEHRDashboard;