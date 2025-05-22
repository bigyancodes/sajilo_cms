// src/pages/dashboards/ReceptionistDashboard.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom"; // Import useLocation
import { rootAxiosInstance } from "../../api/axiosInstance";
import BillingManagement from "../../components/billing/BillingManagement";

const ReceptionistDashboard = () => {
  const location = useLocation(); // Use the useLocation hook
  const [showBilling, setShowBilling] = useState(() => {
    return localStorage.getItem("receptionistActiveSection") === "billing";
  });
  const [activeTab, setActiveTab] = useState("today");
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Persist showBilling in localStorage
  useEffect(() => {
    localStorage.setItem("receptionistActiveSection", showBilling ? "billing" : "appointments");
  }, [showBilling]);

  // Load doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const doctorResponse = await rootAxiosInstance.get("/auth/doctors/");
        setDoctors(doctorResponse.data.slice(0, 3));
      } catch (err) {
        console.error("Failed to load doctors:", err);
      }
    };

    fetchDoctors();
  }, []);

  const loadAppointments = async () => {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const today = new Date().toISOString().split("T")[0];
      const url = `/appointment/receptionist/appointments/?${
        activeTab === "today"
          ? `date_from=${today}&date_to=${today}`
          : activeTab === "upcoming"
          ? `date_from=${today}`
          : activeTab === "pending"
          ? "status=PENDING"
          : ""
      }`;

      const response = await rootAxiosInstance.get(url);
      setAppointments(response.data);
    } catch (err) {
      console.error("Error loading appointments:", err);
      setError("Could not load appointments. Please try again later.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showBilling) {
      loadAppointments();
    }
  }, [activeTab, showBilling]);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-blue-600 text-white overflow-y-auto">
        <nav className="mt-8">
          <ul>
            <li>
              <button
                onClick={() => setShowBilling(false)}
                className={`flex items-center w-full px-6 py-3 text-left ${
                  !showBilling
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
              </button>
            </li>
            <li>
              <button
                onClick={() => setShowBilling(true)}
                className={`flex items-center w-full px-6 py-3 text-left ${
                  showBilling
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
              </button>
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
            <li>
              <Link
                to="/profile"
                className={`flex items-center w-full px-6 py-3 text-left ${
                  location.pathname === "/profile"
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                My Profile
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 mt-16 overflow-y-auto h-[calc(100vh-4rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
              {showBilling ? "Billing Management" : "Appointment Management"}
            </h1>

            {!showBilling && (
              <div className="flex space-x-3">
                <Link
                  to="/book-appointment"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <svg
                    className="h-5 w-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Book New Appointment
                </Link>
              </div>
            )}
          </div>

          {showBilling ? (
            <BillingManagement />
          ) : (
            <>
              {/* Quick Actions and Doctor Cards */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                  <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
                  <div className="mt-4 flex flex-col space-y-2">
                    <Link
                      to="/doctors"
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <svg
                        className="h-4 w-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      View All Doctors
                    </Link>
                    <Link
                      to="/book-appointment"
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <svg
                        className="h-4 w-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Schedule Appointment
                    </Link>
                    <button
                      onClick={loadAppointments}
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <svg
                        className="h-4 w-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Refresh Data
                    </button>
                  </div>
                </div>

                {doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500"
                  >
                    <div className="flex justify-between items-start">
                      <h2 className="text-lg font-medium text-gray-900">
                        Dr. {doctor.full_name || `${doctor.first_name} ${doctor.last_name}`}
                      </h2>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {doctor.specialty || "Doctor"}
                      </span>
                    </div>

                    <h3 className="text-sm font-medium text-gray-700 mt-4 mb-2">
                      Today's Availability
                    </h3>

                    <p className="text-sm text-gray-500">No available slots today</p>

                    <div className="mt-4">
                      <Link
                        to={`/book-appointment/${doctor.id}`}
                        className="w-full text-center block px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                      >
                        Book Appointment
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "today"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => setActiveTab("today")}
                  >
                    Today's Appointments
                  </button>
                  <button
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "upcoming"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => setActiveTab("upcoming")}
                  >
                    Upcoming
                  </button>
                  <button
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "pending"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => setActiveTab("pending")}
                  >
                    Pending Confirmation
                  </button>
                </nav>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
                  {error}
                  <button
                    className="ml-2 text-red-800 underline"
                    onClick={() => setError("")}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Main Content Area */}
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-600">Loading appointments...</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 w-8 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-800">No appointments found</h3>
                    <p className="text-gray-500 mb-4">
                      {activeTab === "today"
                        ? "There are no appointments scheduled for today."
                        : activeTab === "upcoming"
                        ? "There are no upcoming appointments scheduled."
                        : "There are no pending appointments that need confirmation."}
                    </p>
                    <div className="flex justify-center">
                      <button
                        onClick={loadAppointments}
                        className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 mr-4"
                      >
                        Refresh
                      </button>
                      <Link
                        to="/book-appointment"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Schedule New Appointment
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="p-4 bg-blue-50 border-b border-blue-100">
                      <h3 className="text-lg font-medium text-blue-800">
                        Found {appointments.length} appointments
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {appointments.map((appointment) => (
                        <div key={appointment.id} className="p-6 hover:bg-gray-50">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                            <div className="mb-4 md:mb-0">
                              <div className="flex items-center">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    appointment.status === "PENDING"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : appointment.status === "CONFIRMED"
                                      ? "bg-green-100 text-green-800"
                                      : appointment.status === "COMPLETED"
                                      ? "bg-blue-100 text-blue-800"
                                      : appointment.status === "CANCELLED"
                                      ? "bg-gray-100 text-gray-800"
                                      : appointment.status === "MISSED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {appointment.status.charAt(0).toUpperCase() +
                                    appointment.status.slice(1).toLowerCase()}
                                </span>
                                <span className="ml-2 text-sm text-gray-500">
                                  {appointment.id.substring(0, 8)}
                                </span>
                              </div>

                              <h3 className="text-lg font-medium text-gray-900 mt-2">
                                {appointment.patient_name ||
                                  (appointment.patient && appointment.patient.username) ||
                                  "Unknown Patient"}
                              </h3>

                              <div className="text-sm text-gray-600 mt-1">
                                Doctor: {appointment.doctor_name || "Unknown"}
                              </div>

                              <div className="flex items-center mt-1 text-gray-500">
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                <span>
                                  {new Date(appointment.appointment_time).toLocaleDateString()}
                                </span>
                                <span className="mx-2">•</span>
                                <svg
                                  className="w-4 h-4 mr-1"
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
                                <span>
                                  {new Date(appointment.appointment_time).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              {appointment.reason && (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-600">{appointment.reason}</p>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2 md:space-y-0 md:space-x-2 flex flex-col md:flex-row">
                              {appointment.status === "PENDING" && (
                                <button
                                  onClick={() => {
                                    rootAxiosInstance
                                      .post(`/appointment/appointments/${appointment.id}/confirm/`)
                                      .then(() => loadAppointments())
                                      .catch((err) =>
                                        console.error("Failed to confirm appointment:", err)
                                      );
                                  }}
                                  className="px-3 py-1 border border-green-300 text-green-700 rounded-md text-sm hover:bg-green-50"
                                >
                                  Confirm
                                </button>
                              )}

                              {appointment.status !== "CANCELLED" &&
                                appointment.status !== "COMPLETED" && (
                                  <button
                                    onClick={() => {
                                      rootAxiosInstance
                                        .post(`/appointment/appointments/${appointment.id}/cancel/`)
                                        .then(() => loadAppointments())
                                        .catch((err) =>
                                          console.error("Failed to cancel appointment:", err)
                                        );
                                    }}
                                    className="px-3 py-1 border border-red-300 text-red-700 rounded-md text-sm hover:bg-red-50"
                                  >
                                    Cancel
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;