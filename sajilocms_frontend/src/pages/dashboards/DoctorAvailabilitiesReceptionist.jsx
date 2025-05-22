// src/pages/dashboards/DoctorAvailabilitiesReceptionist.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom"; // Import Link and useLocation
import { rootAxiosInstance } from "../../api/axiosInstance";

const DoctorAvailabilitiesReceptionist = () => {
  const location = useLocation(); // Use the useLocation hook
  const [doctors, setDoctors] = useState([]);
  const [doctorAvailabilities, setDoctorAvailabilities] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch doctors and their availabilities
  useEffect(() => {
    const fetchDoctorsAndAvailabilities = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch all doctors (removed the slice to show all doctors)
        const doctorResponse = await rootAxiosInstance.get("/auth/doctors/");
        const fetchedDoctors = doctorResponse.data;
        setDoctors(fetchedDoctors);

        // Fetch availability for each doctor
        const availabilityPromises = fetchedDoctors.map(async (doctor) => {
          try {
            const availabilityResponse = await rootAxiosInstance.get(
              `/appointment/available-slots/?doctor_id=${doctor.id}`
            );
            return { doctorId: doctor.id, slots: availabilityResponse.data || [] };
          } catch (err) {
            console.error(`Failed to load availability for doctor ${doctor.id}:`, err);
            return { doctorId: doctor.id, slots: [] };
          }
        });

        const availabilities = await Promise.all(availabilityPromises);
        const availabilityMap = availabilities.reduce((acc, { doctorId, slots }) => {
          acc[doctorId] = slots;
          return acc;
        }, {});
        setDoctorAvailabilities(availabilityMap);
      } catch (err) {
        console.error("Failed to load doctors:", err);
        setError("Could not load doctor data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorsAndAvailabilities();
  }, []);

  const dayNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-blue-600 text-white overflow-y-auto">
        <nav className="mt-8">
          <ul>
            <li>
              <Link
                to="/receptionist"
                className={`flex items-center w-full px-6 py-3 text-left ${
                  location.pathname === "/receptionist"
                    ? "bg-blue-700 border-l-4 border-white"
                    : "hover:bg-blue-700"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Appointments
              </Link>
            </li>
            <li>
              <Link
                to="/receptionist/billing"
                className={`flex items-center w-full px-6 py-3 text-left ${
                  location.pathname === "/receptionist/billing"
                    ? "bg-blue-700 border-l-4 border-white"
                    : "hover:bg-blue-700"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Billing Management
              </Link>
            </li>
            <li>
              <Link
                to="/receptionist/availabilities"
                className={`flex items-center w-full px-6 py-3 text-left ${
                  location.pathname === "/receptionist/availabilities"
                    ? "bg-blue-700 border-l-4 border-white"
                    : "hover:bg-blue-700"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Doctor Availabilities
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 mt-16 overflow-y-auto h-[calc(100vh-4rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Doctor Availabilities</h1>
            <p className="mt-2 text-lg text-gray-600">
              View weekly availability schedules for all doctors.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
              {error}
              <button
                className="ml-2 text-red-800 underline"
                onClick={() => setError("")}
              >
                Dismiss
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Loading doctor availabilities...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg shadow-md">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800">No doctors found</h3>
              <p className="text-gray-500">There are no doctors available to display.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Dr. {doctor.full_name || `${doctor.first_name} ${doctor.last_name}`}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">{doctor.specialty || "Doctor"}</p>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700">
                      Weekly Schedule
                    </span>
                  </div>

                  {doctorAvailabilities[doctor.id]?.length > 0 ? (
                    <ul className="space-y-2">
                      {doctorAvailabilities[doctor.id]
                        .sort((a, b) => a.day_of_week - b.day_of_week)
                        .map((slot) => (
                          <li
                            key={slot.id}
                            className="flex justify-between items-center bg-gray-50 p-3 rounded-md"
                          >
                            <span className="text-sm font-medium text-gray-700">
                              {dayNames[slot.day_of_week]}
                            </span>
                            <span className="text-sm text-gray-600">
                              {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-500">No availability set</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorAvailabilitiesReceptionist;