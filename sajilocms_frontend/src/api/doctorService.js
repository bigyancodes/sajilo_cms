// src/api/doctorService.js
import { rootAxiosInstance } from "./axiosInstance";

// Base URLs
const DOCTORS_URL = "/auth/doctors/";

// Doctor Management
export const fetchAllDoctors = () => {
  return rootAxiosInstance.get(DOCTORS_URL);
};

export const fetchDoctorById = (id) => {
  return rootAxiosInstance.get(`${DOCTORS_URL}${id}/`);
};

export const fetchDoctorsBySpecialty = (specialty) => {
  return rootAxiosInstance.get(`${DOCTORS_URL}?specialty=${specialty}`);
};

export const fetchDoctorAvailability = (doctorId, date) => {
  return rootAxiosInstance.get(`${DOCTORS_URL}${doctorId}/availability/?date=${date}`);
};

export const updateDoctorProfile = (id, profileData) => {
  return rootAxiosInstance.patch(`${DOCTORS_URL}${id}/`, profileData);
};

// Create a named object before exporting it as default
const doctorService = {
  fetchAllDoctors,
  fetchDoctorById,
  fetchDoctorsBySpecialty,
  fetchDoctorAvailability,
  updateDoctorProfile
};

export default doctorService;
