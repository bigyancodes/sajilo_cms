// src/api/appointmentService.js
import { rootAxiosInstance } from "./axiosInstance";

// Base URLs - using direct paths with the root instance
const APPOINTMENTS_URL = "/appointment/appointments/";
const AVAILABLE_SLOTS_URL = "/appointment/get-available-slots/";
const TIME_OFF_URL = "/appointment/time-offs/";
const AVAILABLE_TIME_SLOTS_URL = "/appointment/available-slots/";

// Appointment Management
export const fetchAppointments = (params = {}) => {
  const queryParams = new URLSearchParams();
  
  // Add query parameters if they exist
  if (params.doctor_id) queryParams.append("doctor_id", params.doctor_id);
  if (params.patient_id) queryParams.append("patient_id", params.patient_id);
  if (params.status) queryParams.append("status", params.status);
  if (params.date_from) queryParams.append("date_from", params.date_from);
  if (params.date_to) queryParams.append("date_to", params.date_to);
  if (params.filter) queryParams.append("filter", params.filter);
  
  const url = `${APPOINTMENTS_URL}?${queryParams.toString()}`;
  return rootAxiosInstance.get(url);
};

export const createAppointment = (appointmentData) => {
  return rootAxiosInstance.post(APPOINTMENTS_URL, appointmentData);
};

export const updateAppointment = (id, appointmentData) => {
  return rootAxiosInstance.put(`${APPOINTMENTS_URL}${id}/`, appointmentData);
};

export const cancelAppointment = (id) => {
  return rootAxiosInstance.post(`${APPOINTMENTS_URL}${id}/cancel/`);
};

export const completeAppointment = (id) => {
  return rootAxiosInstance.post(`${APPOINTMENTS_URL}${id}/complete/`);
};

export const confirmAppointment = (id) => {
  return rootAxiosInstance.post(`${APPOINTMENTS_URL}${id}/confirm/`);
};

// Patient Appointments
export const fetchPatientAppointments = (filter = "upcoming") => {
  return rootAxiosInstance.get(`/appointment/patient/appointments/?filter=${filter}`);
};

// Doctor Appointments
export const fetchDoctorAppointments = (filter = "upcoming", status = "") => {
  let url = `/appointment/doctor/appointments/?filter=${filter}`;
  if (status) url += `&status=${status}`;
  return rootAxiosInstance.get(url);
};

export const fetchPatientHistory = (patientId) => {
  return rootAxiosInstance.get(`/appointment/doctor/patient-history/${patientId}/`);
};

// Availability Management
export const fetchAvailableSlots = (doctorId, date) => {
  let url = `${AVAILABLE_SLOTS_URL}?doctor_id=${doctorId}`;
  if (date) url += `&date=${date}`;
  return rootAxiosInstance.get(url);
};

export const createAvailableSlot = (slotData) => {
  return rootAxiosInstance.post('/appointment/create-available-slot/', slotData);
};

export const setWeeklySchedule = (scheduleData) => {
  return rootAxiosInstance.post(`${AVAILABLE_TIME_SLOTS_URL}set_weekly_schedule/`, scheduleData);
};

// Time Off Management
export const fetchTimeOffs = (doctorId = null) => {
  let url = TIME_OFF_URL;
  if (doctorId) url += `?doctor_id=${doctorId}`;
  return rootAxiosInstance.get(url);
};

export const createTimeOff = (timeOffData) => {
  return rootAxiosInstance.post(TIME_OFF_URL, timeOffData);
};

export const approveTimeOff = (id) => {
  return rootAxiosInstance.post(`${TIME_OFF_URL}${id}/approve/`);
};

export const getPendingTimeOffs = () => {
  return rootAxiosInstance.get(`${TIME_OFF_URL}pending_approvals/`);
};

// Dashboard Statistics
export const fetchAdminAppointments = (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {  // Only add defined values
      queryParams.append(key, value);
    }
  });
  
  return rootAxiosInstance.get(`/appointment/admin/appointments/?${queryParams.toString()}`);
};

// Receptionist Appointments
export const fetchReceptionistAppointments = (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {  // Only add defined values
      queryParams.append(key, value);
    }
  });
  
  return rootAxiosInstance.get(`/appointment/receptionist/appointments/?${queryParams.toString()}`);
};

export const fetchDoctorStats = (dateFrom = "", dateTo = "") => {
  let url = '/appointment/admin/doctor-stats/';
  if (dateFrom || dateTo) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    url += `?${params.toString()}`;
  }
  return rootAxiosInstance.get(url);
};