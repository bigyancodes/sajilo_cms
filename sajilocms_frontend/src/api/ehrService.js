// src/api/ehrService.js
import { rootAxiosInstance } from "./axiosInstance";

// Base URL for EHR API endpoints
const EHR_URL = "/ehr/";

// Medical Records
export const fetchMedicalRecords = (params = {}) => {
  const queryParams = new URLSearchParams();
  
  // Add query parameters if they exist
  if (params.patient_id) queryParams.append("patient_id", params.patient_id);
  if (params.doctor_id) queryParams.append("doctor_id", params.doctor_id);
  if (params.appointment_id) queryParams.append("appointment_id", params.appointment_id);
  if (params.date_from) queryParams.append("date_from", params.date_from);
  if (params.date_to) queryParams.append("date_to", params.date_to);
  
  const url = `${EHR_URL}records/?${queryParams.toString()}`;
  return rootAxiosInstance.get(url);
};

export const fetchMedicalRecordById = (id) => {
  console.log(`Fetching medical record with ID: ${id}`);
  return rootAxiosInstance.get(`${EHR_URL}records/${id}/`);
};

export const createMedicalRecord = (recordData) => {
  console.log("Creating medical record with data:", recordData);
  return rootAxiosInstance.post(`${EHR_URL}records/`, recordData);
};

export const updateMedicalRecord = (id, recordData) => {
  console.log(`Updating medical record ${id} with data:`, recordData);
  return rootAxiosInstance.put(`${EHR_URL}records/${id}/`, recordData);
};

export const deleteMedicalRecord = (id) => {
  return rootAxiosInstance.delete(`${EHR_URL}records/${id}/`);
};

// Get or create medical record for a specific appointment
export const getOrCreateMedicalRecord = (appointmentId) => {
  console.log(`Getting or creating medical record for appointment: ${appointmentId}`);
  return rootAxiosInstance.get(`${EHR_URL}appointment/${appointmentId}/`);
};

// Create medical record and optionally mark appointment as complete
export const createMedicalRecordWithAppointment = (recordData, markComplete = false) => {
  console.log(`Creating medical record with appointment completion option: ${markComplete}`);
  const data = {
    ...recordData,
    mark_complete: markComplete
  };
  return rootAxiosInstance.post(`${EHR_URL}create-with-appointment/`, data);
};

// Export medical record as PDF
export const exportMedicalRecordPdf = (id) => {
  console.log(`Exporting medical record ${id} as PDF`);
  return rootAxiosInstance.get(`${EHR_URL}records/${id}/export_pdf/`, {
    responseType: 'blob',
  });
};

// Mark a medical record as completed
export const markMedicalRecordAsCompleted = (id) => {
  console.log(`Marking medical record ${id} as completed`);
  return rootAxiosInstance.post(`${EHR_URL}records/${id}/mark_completed/`);
};

// Mark a medical record as processing (in progress)
export const markMedicalRecordAsProcessing = (id) => {
  console.log(`Marking medical record ${id} as processing`);
  return rootAxiosInstance.post(`${EHR_URL}records/${id}/mark_processing/`);
};

// Attachments
export const fetchAttachments = (medicalRecordId) => {
  return rootAxiosInstance.get(`${EHR_URL}attachments/?medical_record_id=${medicalRecordId}`);
};

export const uploadAttachment = (data) => {
  // Create FormData object for file upload
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('medical_record', data.medical_record);
  formData.append('file_type', data.file_type);
  
  if (data.description) {
    formData.append('description', data.description);
  }
  
  return rootAxiosInstance.post(`${EHR_URL}attachments/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const downloadAttachment = (id) => {
  return rootAxiosInstance.get(`${EHR_URL}attachments/${id}/download/`, {
    responseType: 'blob',
  });
};

// Patient Medical History with enhanced debugging
export const fetchPatientMedicalHistory = (patientId) => {
  console.log(`Calling fetchPatientMedicalHistory API with patientId: ${patientId}`);
  
  if (!patientId) {
    console.error("PatientId is undefined or null");
    return Promise.reject(new Error("Patient ID is required"));
  }
  
  const url = `${EHR_URL}patient-history/${patientId}/`;
  console.log(`API URL: ${url}`);
  
  return rootAxiosInstance.get(url)
    .then(response => {
      console.log("Patient history API response:", response);
      return response;
    })
    .catch(error => {
      console.error("Patient history API error:", error);
      console.error("Error response:", error.response);
      throw error;
    });
};

// Audit Logs (Admin Only)
export const fetchMedicalRecordAuditLogs = (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.medical_record_id) queryParams.append("medical_record_id", params.medical_record_id);
  if (params.user_id) queryParams.append("user_id", params.user_id);
  if (params.action) queryParams.append("action", params.action);
  if (params.date_from) queryParams.append("date_from", params.date_from);
  if (params.date_to) queryParams.append("date_to", params.date_to);
  
  return rootAxiosInstance.get(`${EHR_URL}audit-logs/?${queryParams.toString()}`);
};