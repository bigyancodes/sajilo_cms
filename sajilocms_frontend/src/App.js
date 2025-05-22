import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import UnauthorizedPage from "./pages/auth/UnauthorizedPage";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import DoctorDashboard from "./pages/dashboards/DoctorDashboard";
import ReceptionistDashboard from "./pages/dashboards/ReceptionistDashboard";
import PatientDashboard from "./pages/dashboards/PatientDashboard";
import PharmacistDashboard from "./pages/dashboards/PharmacistDashboard";
import DoctorAvailabilitiesReceptionist from "./pages/dashboards/DoctorAvailabilitiesReceptionist"; // New import
import DoctorList from "./components/DoctorList";
import AppointmentBooking from "./components/appointments/AppointmentBooking";
import ChatRoom from "./components/communication/ChatRoom";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import StripePaymentRedirect from "./components/billing/StripePaymentRedirect";
import BillDetails from "./components/billing/BillDetails";
import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentCancel from "./pages/payment/PaymentCancel";
import ProfilePage from "./pages/settings/ProfilePage";
import pharmacyRoutes from "./routes/pharmacyRoutes";

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
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<><Navbar /><Home /></>} />
          <Route path="/login" element={<><Navbar /><LoginPage /></>} />
          <Route path="/register" element={<><Navbar /><RegisterPage /></>} />
          <Route path="/unauthorized" element={<><Navbar /><UnauthorizedPage /></>} />
          <Route path="/doctors" element={<><Navbar /><DoctorList /></>} />
          
          {/* Password Reset Routes */}
          <Route path="/forgot-password" element={<><Navbar /><ForgotPasswordPage /></>} />
          <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />

          {/* Protected Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <><Navbar /><AdminDashboard /></>
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/*"
            element={
              <ProtectedRoute roles={["DOCTOR"]}>
                <><Navbar /><DoctorDashboard /></>
              </ProtectedRoute>
            }
          />
          {/* Receptionist Routes */}
          <Route
            path="/receptionist"
            element={
              <ProtectedRoute roles={["RECEPTIONIST"]}>
                <><Navbar /><ReceptionistDashboard /></>
              </ProtectedRoute>
            }
          />
          <Route
            path="/receptionist/billing"
            element={
              <ProtectedRoute roles={["RECEPTIONIST"]}>
                <><Navbar /><ReceptionistDashboard /></>
              </ProtectedRoute>
            }
          />
          <Route
            path="/receptionist/availabilities"
            element={
              <ProtectedRoute roles={["RECEPTIONIST"]}>
                <><Navbar /><DoctorAvailabilitiesReceptionist /></>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/*"
            element={
              <ProtectedRoute roles={["PATIENT"]}>
                <><Navbar /><PatientDashboard /></>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/*"
            element={
              <ProtectedRoute roles={["PHARMACIST", "ADMIN"]}>
                <><Navbar /><PharmacistDashboard /></>
              </ProtectedRoute>
            }
          />
          <Route
            path="/book-appointment/:doctorId?"
            element={
              <ProtectedRoute roles={["PATIENT", "RECEPTIONIST", "ADMIN"]}>
                <><Navbar /><AppointmentBooking /></>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:targetUserId"
            element={
              <ProtectedRoute roles={["PATIENT", "DOCTOR"]}>
                <><Navbar /><ChatRoom /></>
              </ProtectedRoute>
            }
          />

          {/* Payment Routes */}
          <Route
            path="/payment/:billId"
            element={
              <ProtectedRoute roles={["PATIENT", "RECEPTIONIST", "ADMIN"]}>
                <><Navbar /><StripePaymentRedirect /></>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bill/:billId"
            element={
              <ProtectedRoute roles={["PATIENT", "RECEPTIONIST", "ADMIN"]}>
                <><Navbar /><BillDetails /></>
              </ProtectedRoute>
            }
          />
          <Route path="/payment-success" element={<><Navbar /><PaymentSuccess /></>} />
          <Route path="/payment-cancel" element={<><Navbar /><PaymentCancel /></>} />
          
          {/* Profile Route - accessible to all authenticated users */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={["PATIENT", "DOCTOR", "RECEPTIONIST", "ADMIN", "PHARMACIST"]}>
                <><Navbar /><ProfilePage /></>
              </ProtectedRoute>
            }
          />
          
          {/* Pharmacy Routes */}
          {pharmacyRoutes.map((route, index) => (
            <Route
              key={`pharmacy-${index}`}
              path={route.path}
              element={
                <ProtectedRoute roles={route.requiredRoles}>
                  <>
                    <Navbar />
                    {route.element}
                  </>
                </ProtectedRoute>
              }
            />
          ))}

          {/* 404 Fallback */}
          <Route path="*" element={<h2 className="text-center p-10 text-2xl">Page Not Found</h2>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;