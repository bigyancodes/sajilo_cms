import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { confirmPasswordReset } from "../../api/axiosInstance";
import { fetchCSRFToken } from "../../api/axiosInstance";
// Import React Icons for password visibility toggle
import { FaEye, FaEyeSlash } from 'react-icons/fa';

// For debugging
console.log('ResetPasswordPage module loaded');

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [csrfTokenLoaded, setCsrfTokenLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // State to toggle confirm password visibility
  const { uid, token } = useParams();
  const navigate = useNavigate();
  
  console.log('ResetPasswordPage rendered with params:', { uid, token });

  // Validate parameters on mount
  useEffect(() => {
    console.log('Validating parameters:', { uid, token });
    if (!uid || !token) {
      console.error('Missing required parameters for password reset');
      setMessage({
        type: "error",
        text: "Invalid password reset link. Please request a new one."
      });
    }
  }, [uid, token]);

  // Fetch CSRF token on mount
  useEffect(() => {
    const getCSRFToken = async () => {
      try {
        console.log('Fetching CSRF token...');
        const result = await fetchCSRFToken();
        console.log('CSRF token fetch result:', result);
        setCsrfTokenLoaded(true);
      } catch (error) {
        console.error("CSRF token fetch failed:", error);
        setMessage({ 
          type: "error", 
          text: "Failed to load security token. Please refresh the page." 
        });
      }
    };
    getCSRFToken();
  }, []);

  // Debug state changes
  useEffect(() => {
    console.log('Current state:', { password, confirmPassword, loading, resetSuccess, csrfTokenLoaded, showPassword, showConfirmPassword });
  }, [password, confirmPassword, loading, resetSuccess, csrfTokenLoaded, showPassword, showConfirmPassword]);

  // Debug redirect trigger
  useEffect(() => {
    if (resetSuccess) {
      console.log('resetSuccess changed to true, scheduling redirect to /login');
      const timeout = setTimeout(() => {
        console.log('Executing redirect to /login');
        navigate("/login");
      }, 3000);
      return () => {
        console.log('Cleaning up redirect timeout');
        clearTimeout(timeout);
      };
    }
  }, [resetSuccess, navigate]);

  const validateForm = () => {
    console.log('Validating form with:', { password, confirmPassword });
    if (!password || !confirmPassword) {
      setMessage({ type: "error", text: "Both fields are required" });
      return false;
    }

    if (password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters long" });
      return false;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Password reset form submitted manually by user');

    if (!csrfTokenLoaded) {
      console.error('CSRF token not loaded');
      setMessage({ 
        type: "error", 
        text: "Security token not loaded. Please refresh the page." 
      });
      return;
    }

    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      console.log('Making API call to reset password with:', { uid, token, password });
      const response = await confirmPasswordReset(uid, token, password);
      console.log('Password reset API response:', response);
      
      setMessage({ 
        type: "success", 
        text: response.data.message || "Your password has been reset successfully." 
      });
      setResetSuccess(true);
    } catch (error) {
      console.error("Password reset failed:", error);
      console.error("Error details:", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      
      setMessage({ 
        type: "error", 
        text: error?.response?.data?.error || "Failed to reset password. This link may be expired or invalid." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-gray-600">Enter your new password</p>
        </div>

        {message.text && (
          <div className={`mb-4 p-4 rounded ${
            message.type === "error" 
              ? "bg-red-50 border-l-4 border-red-500 text-red-700" 
              : "bg-green-50 border-l-4 border-green-500 text-green-700"
          }`}>
            <p>{message.text}</p>
            {resetSuccess && (
              <p className="mt-2">Redirecting to login page...</p>
            )}
          </div>
        )}

        {!resetSuccess && (
          <form onSubmit={(e) => {
            console.log('Form submission triggered');
            handleSubmit(e);
          }} className="space-y-6">
            <input type="hidden" name="dummy" value="prevent-auto-submit" />
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Must be at least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !uid || !token || !password || !confirmPassword}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading || !uid || !token || !password || !confirmPassword ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed transition duration-150 ease-in-out`}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;