import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import UnauthorizedPage from "./pages/auth/UnauthorizedPage";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import DoctorDashboard from "./pages/dashboards/DoctorDashboard";
import ReceptionistDashboard from "./pages/dashboards/ReceptionistDashboard";
import PharmacistDashboard from "./pages/dashboards/PharmacistDashboard";
import PatientDashboard from "./pages/dashboards/PatientDashboard";
import DoctorList from "./components/DoctorList";
import AppointmentBooking from "./components/appointments/AppointmentBooking";
import ChatRoom from "./components/communication/ChatRoom";
import ProtectedRoute from "./components/ProtectedRoute";
import Chatbot from "./components/chatbot/Chatbot"; // Import the Chatbot component

const Home = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center p-8 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome to Sajilo CMS</h1>
      <p className="text-gray-600 mb-6">Healthcare Management Simplified</p>
      <div className="flex justify-center space-x-4">
        <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Login
        </a>
        <a href="/register" className="px-4 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
          Register
        </a>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/doctors" element={<DoctorList />} />

          {/* Protected Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/*"
            element={
              <ProtectedRoute roles={["DOCTOR"]}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receptionist/*"
            element={
              <ProtectedRoute roles={["RECEPTIONIST"]}>
                <ReceptionistDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/*"
            element={
              <ProtectedRoute roles={["PHARMACIST"]}>
                <PharmacistDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/*"
            element={
              <ProtectedRoute roles={["PATIENT"]}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book-appointment/:doctorId?"
            element={
              <ProtectedRoute roles={["PATIENT", "RECEPTIONIST", "ADMIN"]}>
                <AppointmentBooking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:targetUserId"
            element={
              <ProtectedRoute roles={["PATIENT", "DOCTOR"]}>
                <ChatRoom />
              </ProtectedRoute>
            }
          />

          {/* 404 Fallback */}
          <Route path="*" element={<h2 className="text-center p-10 text-2xl">Page Not Found</h2>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;