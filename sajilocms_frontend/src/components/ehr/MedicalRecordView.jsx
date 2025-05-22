// src/components/ehr/MedicalRecordView.jsx
import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { 
  fetchMedicalRecordById, 
  exportMedicalRecordPdf,
  getOrCreateMedicalRecord,
  markMedicalRecordAsCompleted,
  markMedicalRecordAsProcessing
} from "../../api/ehrService";
import AttachmentsSection from "./AttachmentsSection";
import PrescriptionsSection from "./PrescriptionsSection";

// Status badge component
const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "PROCESSING":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  );
};

const MedicalRecordView = ({ recordId, appointmentId, onClose, onEdit, readOnly = false }) => {
  const { user } = useContext(AuthContext);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  
  const isDoctor = user?.role === "DOCTOR";
  const canEdit = isDoctor && record;
  
  useEffect(() => {
    const loadRecord = async () => {
      try {
        setLoading(true);
        setError("");
        
        let response;
        
        if (recordId) {
          // Load existing record by ID
          response = await fetchMedicalRecordById(recordId);
        } else if (appointmentId) {
          // Get or create record for appointment
          response = await getOrCreateMedicalRecord(appointmentId);
        } else {
          throw new Error("Either recordId or appointmentId must be provided");
        }
        
        setRecord(response.data);
      } catch (err) {
        console.error("Failed to load medical record:", err);
        setError(
          err.response?.data?.error || 
          "Could not load the medical record. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };
    
    loadRecord();
  }, [recordId, appointmentId]);
  
  const handleExportPdf = async () => {
    if (!record?.id) return;
    
    try {
      setExporting(true);
      
      const response = await exportMedicalRecordPdf(record.id);
      
      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `medical_record_${record.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };
  
  const handleMarkAsCompleted = async () => {
    if (!record?.id) return;
    
    try {
      setChangingStatus(true);
      const response = await markMedicalRecordAsCompleted(record.id);
      setRecord(response.data);
    } catch (err) {
      console.error("Failed to mark record as completed:", err);
      alert("Failed to mark record as completed. Please try again.");
    } finally {
      setChangingStatus(false);
    }
  };
  
  const handleMarkAsProcessing = async () => {
    if (!record?.id) return;
    
    try {
      setChangingStatus(true);
      const response = await markMedicalRecordAsProcessing(record.id);
      setRecord(response.data);
    } catch (err) {
      console.error("Failed to mark record as processing:", err);
      alert("Failed to mark record as processing. Please try again.");
    } finally {
      setChangingStatus(false);
    }
  };
  
  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full py-8 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Back
        </button>
      </div>
    );
  }
  
  if (!record) {
    return (
      <div className="w-full py-8 text-center">
        <div className="text-gray-500 mb-4">No medical record found</div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Back
        </button>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Medical Record</h2>
          <div className="flex items-center space-x-2">
            {record.is_locked && (
              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-md uppercase font-semibold">LOCKED</span>
            )}
            <span className={`text-white text-xs px-2 py-1 rounded-md uppercase font-semibold ${record.status === "PROCESSING" ? "bg-orange-500" : "bg-green-500"}`}>
              {record.status}
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-blue-200">Patient</p>
            <p className="font-medium">{record.patient_name}</p>
          </div>
          <div>
            <p className="text-blue-200">Doctor</p>
            <p className="font-medium">{record.doctor_name}</p>
          </div>
          <div>
            <p className="text-blue-200">Date</p>
            <p className="font-medium">
              {new Date(record.appointment_time).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      
      {/* Previous Visit Reference */}
      {record.previous_record_info && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center">
          <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          <span className="text-sm text-blue-800">
            Follow-up of previous visit on {new Date(record.previous_record_info.appointment_time).toLocaleDateString()} with {record.previous_record_info.doctor_name}
          </span>
        </div>
      )}
      
      {/* Follow-up Records Reference */}
      {record.follow_up_records && record.follow_up_records.length > 0 && (
        <div className="px-6 py-3 bg-green-50 border-b border-green-100">
          <div className="flex items-center mb-2">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-medium text-green-800">
              This visit has {record.follow_up_records.length} follow-up visit{record.follow_up_records.length > 1 ? 's' : ''}:
            </span>
          </div>
          <ul className="space-y-1 pl-7">
            {record.follow_up_records.map(followUp => (
              <li key={followUp.id} className="text-sm text-green-700">
                {new Date(followUp.appointment_time).toLocaleDateString()} with {followUp.doctor_name}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Content */}
      <div className="p-6">
        {/* Action Buttons */}
        <div className="flex justify-end mb-6 space-x-3">
          {!readOnly && canEdit && (
            <button
              onClick={() => onEdit(record)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="h-5 w-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Record
            </button>
          )}
          
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <span className="inline-block">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            ) : (
              <>
                <svg className="h-5 w-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </>
            )}
          </button>
          
          {isDoctor && (
            <div className="flex space-x-2">
              {record.status === "PROCESSING" ? (
                <button
                  onClick={handleMarkAsCompleted}
                  disabled={changingStatus}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingStatus ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Mark as Completed"
                  )}
                </button>
              ) : (
                <button
                  onClick={handleMarkAsProcessing}
                  disabled={changingStatus}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingStatus ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Mark as Processing"
                  )}
                </button>
              )}
            </div>
          )}
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
        
        {/* Medical Record Sections */}
        <div className="space-y-8">
          {/* Chief Complaint */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Chief Complaint</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              {record.chief_complaint ? (
                <div className="whitespace-pre-line">{record.chief_complaint}</div>
              ) : (
                <div className="text-gray-500 italic">No chief complaint recorded</div>
              )}
            </div>
          </div>
          
          {/* Observations */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Observations</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              {record.observations ? (
                <div className="whitespace-pre-line">{record.observations}</div>
              ) : (
                <div className="text-gray-500 italic">No observations recorded</div>
              )}
            </div>
          </div>
          
          {/* Diagnosis */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Diagnosis</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              {record.diagnosis ? (
                <div className="whitespace-pre-line">{record.diagnosis}</div>
              ) : (
                <div className="text-gray-500 italic">No diagnosis recorded</div>
              )}
            </div>
          </div>
          
          {/* Treatment Plan */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Treatment Plan</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              {record.treatment_plan ? (
                <div className="whitespace-pre-line">{record.treatment_plan}</div>
              ) : (
                <div className="text-gray-500 italic">No treatment plan recorded</div>
              )}
            </div>
          </div>
          
          {/* Prescriptions */}
          <PrescriptionsSection 
            prescriptions={record.prescriptions || []} 
            readOnly={true}
          />
          
          {/* Additional Notes */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Additional Notes</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              {record.notes ? (
                <div className="whitespace-pre-line">{record.notes}</div>
              ) : (
                <div className="text-gray-500 italic">No additional notes</div>
              )}
            </div>
          </div>
          
          {/* Attachments */}
          <AttachmentsSection 
            medicalRecordId={record.id}
            attachments={record.attachments || []} 
            readOnly={readOnly || record.is_locked}
          />
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordView;