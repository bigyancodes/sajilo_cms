// src/pages/auth/ForgotPasswordPage.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../api/axiosInstance";

// For debugging
console.log('ForgotPasswordPage module loaded');

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Password reset request form submitted with email:', email);
    
    if (!email.trim()) {
      console.log('Empty email submitted');
      setMessage({ type: "error", text: "Please enter your email address" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      console.log('Making API call to request password reset for email:', email);
      const response = await requestPasswordReset(email);
      console.log('Password reset request API response:', response);
      
      setMessage({ 
        type: "success", 
        text: response.data.message || "If your email is registered, you will receive a password reset link shortly." 
      });
      setEmail(""); // Clear the email field
    } catch (error) {
      console.error("Password reset request failed:", error);
      console.error("Error details:", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      
      setMessage({ 
        type: "error", 
        text: error?.response?.data?.error || "Failed to send password reset link. Please try again." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Forgot Password</h2>
          <p className="text-gray-600">Enter your email to receive a password reset link</p>
        </div>

        {message.text && (
          <div className={`mb-4 p-4 rounded ${
            message.type === "error" 
              ? "bg-red-50 border-l-4 border-red-500 text-red-700" 
              : "bg-green-50 border-l-4 border-green-500 text-green-700"
          }`}>
            <p>{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed transition duration-150 ease-in-out`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Remember your password?{" "}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;