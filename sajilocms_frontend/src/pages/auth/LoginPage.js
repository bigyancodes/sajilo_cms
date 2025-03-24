// src/pages/auth/LoginPage.js
import React, { useState, useContext, useEffect, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { fetchCSRFToken } from "../../api/axiosInstance";

// Use your Google Client ID here
const CLIENT_ID = "482794007286-e5a51mvbrkou320jsqbpn4innjfd6idq.apps.googleusercontent.com";

function LoginPage() {
  const { login, googleLogin, user, authInitialized } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState(() => localStorage.getItem("savedEmail") || "");
  const [password, setPassword] = useState("");
  const [isChecked, setIsChecked] = useState(() => localStorage.getItem("rememberMe") === "true");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [csrfTokenLoaded, setCsrfTokenLoaded] = useState(false);

  // Memoize redirectBasedOnRole to use it in useEffect
  const redirectBasedOnRole = useCallback((role) => {
    const roleUpper = role?.toUpperCase();
    switch (roleUpper) {
      case "ADMIN":
        navigate("/admin", { replace: true });
        break;
      case "DOCTOR":
        navigate("/doctor", { replace: true });
        break;
      case "RECEPTIONIST":
        navigate("/receptionist", { replace: true });
        break;
      case "PHARMACIST":
        navigate("/pharmacist", { replace: true });
        break;
      default:
        navigate("/patient", { replace: true });
    }
  }, [navigate]); // Only depends on navigate

  // Redirect if already logged in
  useEffect(() => {
    if (authInitialized && user) {
      redirectBasedOnRole(user.role);
    }
  }, [user, authInitialized, redirectBasedOnRole]); // Added redirectBasedOnRole as dependency

  // Fetch CSRF token on mount
  useEffect(() => {
    const getCSRFToken = async () => {
      try {
        await fetchCSRFToken();
        setCsrfTokenLoaded(true);
      } catch (error) {
        console.error("CSRF token fetch failed:", error);
      }
    };
    getCSRFToken();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!csrfTokenLoaded) {
      setErrorMsg("CSRF token not yet loaded. Please try again.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await login(email, password);
      if (res.success) {
        if (isChecked) {
          localStorage.setItem("savedEmail", email);
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("savedEmail");
          localStorage.removeItem("rememberMe");
        }
        redirectBasedOnRole(res.role);
      } else {
        setErrorMsg(res.message || "Invalid credentials. Try again.");
      }
    } catch (error) {
      setErrorMsg(error?.response?.data?.error || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (response) => {
    if (!csrfTokenLoaded) {
      setErrorMsg("CSRF token not yet loaded. Please try again.");
      return;
    }

    if (response.credential) {
      setLoading(true);
      setErrorMsg("");

      try {
        const res = await googleLogin(response.credential);
        if (res.success) {
          redirectBasedOnRole(res.role);
        } else {
          setErrorMsg(res.message || "Google login failed. Try again.");
        }
      } catch (error) {
        setErrorMsg(error?.response?.data?.error || "Google login failed.");
      } finally {
        setLoading(false);
      }
    } else {
      setErrorMsg("Google login failed. Please try again.");
    }
  };

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl w-full flex overflow-hidden rounded-xl shadow-xl">
          {/* Left side - Form */}
          <div className="w-full md:w-1/2 bg-white p-8 md:p-10">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                  Welcome back
                </h2>
                <p className="text-gray-600">Sign in to your account</p>
              </div>
              
              {errorMsg && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
                  <p>{errorMsg}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
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
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => setIsChecked(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed transition duration-150 ease-in-out`}
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </button>
                </div>
              </form>
              
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleLogin}
                    onError={() => setErrorMsg("Google login failed. Please try again.")}
                    useOneTap
                    theme="outline"
                    size="large"
                    type="standard"
                    shape="rectangular"
                    text="signin_with"
                    locale="en_US"
                  />
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                      Register now
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side - Image and info */}
          <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-white flex flex-col justify-center">
            <h1 className="text-4xl font-bold mb-4">Sajilo Clinic</h1>
            <p className="text-xl mb-8">Healthcare Management Simplified</p>
            <div className="space-y-4">
              <div className="flex items-center">
                <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Streamlined patient management</span>
              </div>
              <div className="flex items-center">
                <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Efficient doctor appointments</span>
              </div>
              <div className="flex items-center">
                <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Integrated pharmacy system</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default LoginPage;