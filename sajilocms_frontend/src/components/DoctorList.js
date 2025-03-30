// src/components/DoctorList.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllDoctors, fetchSpecialties } from "../api/axiosInstance";

const DoctorCard = ({ doctor, onBookAppointment }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
        <div className="h-16 w-16 rounded-full bg-white text-blue-600 font-bold text-xl mx-auto flex items-center justify-center">
          {doctor.first_name?.charAt(0) || doctor.email.charAt(0)}
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Dr. {doctor.full_name || `${doctor.first_name} ${doctor.last_name}` || doctor.email}
        </h3>
        <div className="mb-2">
          <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
            {doctor.specialty || "General Practice"}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-4">License: {doctor.license_number || "N/A"}</p>
        <button 
          onClick={() => onBookAppointment(doctor.id)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Book Appointment
        </button>
      </div>
    </div>
  );
};

const DoctorList = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Load specialties on component mount
  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const response = await fetchSpecialties();
        setSpecialties(response.data.specialties || []);
      } catch (err) {
        console.error("Failed to load specialties:", err);
        setError("Failed to load specialties.");
      }
    };
    loadSpecialties();
  }, []);

  // Load doctors when specialty filter changes
  useEffect(() => {
    const loadDoctors = async () => {
      setLoading(true);
      setError("");
      try {
        const url = selectedSpecialty
          ? `doctors/?specialty=${encodeURIComponent(selectedSpecialty)}`
          : "doctors/";
        const response = await fetchAllDoctors(url);
        setDoctors(response.data);
      } catch (err) {
        console.error("Failed to load doctors:", err);
        setError("Failed to load doctors. Please try again later.");
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };
    loadDoctors();
  }, [selectedSpecialty]);

  // Filter doctors by search query
  const filteredDoctors = doctors.filter((doctor) => {
    if (!searchQuery) return true;
    
    const fullName = `${doctor.first_name || ''} ${doctor.last_name || ''}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return (
      fullName.includes(query) ||
      (doctor.specialty && doctor.specialty.toLowerCase().includes(query)) ||
      (doctor.email && doctor.email.toLowerCase().includes(query))
    );
  });

  // Handle booking appointment
  const handleBookAppointment = (doctorId) => {
    console.log("Navigating to book appointment with doctor:", doctorId);
    navigate(`/book-appointment/${doctorId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Doctors</h2>
        <p className="text-gray-600 max-w-3xl">
          Find the right healthcare professional for your needs. You can filter by specialty or search for a specific doctor.
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="w-full md:w-64">
          <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Specialty
          </label>
          <select
            id="specialty"
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="">All Specialties</option>
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-80">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search Doctors
          </label>
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              id="search"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-4 pr-12 sm:text-sm border-gray-300 rounded-md"
              placeholder="Name, specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Results */}
          {filteredDoctors.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No doctors found</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? "Try adjusting your search criteria"
                  : selectedSpecialty
                  ? `No doctors found for ${selectedSpecialty} specialty`
                  : "No doctors are available at the moment"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDoctors.map((doctor) => (
                <DoctorCard 
                  key={doctor.id} 
                  doctor={doctor} 
                  onBookAppointment={handleBookAppointment}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DoctorList;