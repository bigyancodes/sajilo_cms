import React, { useState, useContext } from "react";
import { Link, Navigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import PatientAppointments from "../../components/appointments/PatientAppointments";
import PatientEHRDashboard from "../../components/ehr/PatientEHRDashboard";
import CommunicationList from "../../components/communication/CommunicationList";
import Chatbot from "../../components/chatbot/Chatbot"; // Import Chatbot component

const PatientDashboard = () => {
  const { user } = useContext(AuthContext);
  const [activeSection, setActiveSection] = useState("appointments");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
        <p className="mt-2 text-lg text-gray-600">
          Welcome, {user.first_name} {user.last_name}
        </p>
      </div>

      <div className="mb-8">
        <div className="sm:hidden">
          <label htmlFor="section-select" className="sr-only">
            Select a section
          </label>
          <select
            id="section-select"
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="appointments">Appointments</option>
            <option value="medical-records">Medical Records</option>
            <option value="communication">Communication</option>
            <option value="ai-assistant">AI Assistant</option> {/* New section */}
            <option value="pharmacy">Pharmacy</option> {/* New section */}
          </select>
        </div>

        <div className="hidden sm:block">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeSection === "appointments"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
                onClick={() => setActiveSection("appointments")}
              >
                Appointments
              </button>
              <button
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeSection === "medical-records"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
                onClick={() => setActiveSection("medical-records")}
              >
                Medical Records
              </button>
              <button
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeSection === "communication"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
                onClick={() => setActiveSection("communication")}
              >
                Communication
              </button>
              {/* New tab for AI Assistant */}
              <button
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeSection === "ai-assistant"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
                onClick={() => setActiveSection("ai-assistant")}
              >
                AI Assistant
              </button>
              {/* New tab for Pharmacy */}
              <button
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeSection === "pharmacy"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
                onClick={() => setActiveSection("pharmacy")}
              >
                Pharmacy
              </button>
            </nav>
          </div>
        </div>
      </div>

      {activeSection === "appointments" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <PatientAppointments />
          </div>
          <div className="space-y-6">
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                <h2 className="text-xl font-bold">Quick Actions</h2>
              </div>
              <div className="p-6 space-y-4">
                <Link
                  to="/book-appointment"
                  className="block w-full px-4 py-3 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition-colors"
                >
                  Book New Appointment
                </Link>
                <Link
                  to="/doctors"
                  className="block w-full px-4 py-3 bg-white border border-gray-300 text-blue-600 text-center rounded-md hover:bg-gray-50 transition-colors"
                >
                  Browse Doctors
                </Link>
                <button
                  onClick={() => setActiveSection("medical-records")}
                  className="block w-full px-4 py-3 bg-white border border-gray-300 text-blue-600 text-center rounded-md hover:bg-gray-50 transition-colors"
                >
                  View Medical Records
                </button>
                {/* New button to open AI Assistant */}
                <button
                  onClick={() => setActiveSection("ai-assistant")}
                  className="block w-full px-4 py-3 bg-white border border-gray-300 text-blue-600 text-center rounded-md hover:bg-gray-50 transition-colors"
                >
                  Ask AI Assistant
                </button>
              </div>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                <h2 className="text-xl font-bold">Health Tips</h2>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-gray-700">Regular check-ups are key to preventive care</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-gray-700">Stay hydrated by drinking 8 glasses of water daily</span>
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-gray-700">At least 30 minutes of physical activity daily</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : activeSection === "medical-records" ? (
        <PatientEHRDashboard />
      ) : activeSection === "communication" ? (
        <CommunicationList userRole="PATIENT" />
      ) : activeSection === "pharmacy" ? (
        <Navigate to="/patient/order-medicine" />
      ) : (
        // AI Assistant section
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">AI Healthcare Assistant</h2>
            <p className="mt-2 text-gray-600">
              Ask questions about your appointments, medical records, prescriptions, or find doctors.
              The AI assistant has access to your personal healthcare information and can provide personalized assistance.
            </p>
          </div>
          
          {/* Embedded chatbot in the dashboard */}
          <div className="h-[600px] border border-gray-200 rounded-lg overflow-hidden">
            <div className="h-full flex">
              {/* This is an iframe-style embedded version that shows the full chatbot UI */}
              <div className="w-full h-full">
                <div className="h-full flex flex-col">
                  <div className="bg-blue-600 text-white p-4">
                    <h3 className="font-semibold">Healthcare Assistant</h3>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Chatbot embedded={true} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">What you can ask:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-700 mb-2">Appointments</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• "When is my next appointment?"</li>
                  <li>• "Do I have any appointments next week?"</li>
                  <li>• "Show all my past appointments"</li>
                </ul>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-700 mb-2">Medical Records</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• "What's in my medical record?"</li>
                  <li>• "Show my recent diagnoses"</li>
                  <li>• "When was my last checkup?"</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-700 mb-2">Prescriptions</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• "What medications am I taking?"</li>
                  <li>• "Show my prescriptions"</li>
                  <li>• "What's the dosage for my medication?"</li>
                </ul>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-700 mb-2">Doctors</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• "Show me all doctors"</li>
                  <li>• "List cardiologists"</li>
                  <li>• "When is Dr. Smith available?"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;