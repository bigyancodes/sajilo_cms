// src/components/appointments/ReceptionistAppointmentManager.jsx
import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  fetchAdminAppointments, 
  cancelAppointment, 
  confirmAppointment,
  fetchAvailableSlots 
} from '../../api/appointmentService';
import { fetchAllDoctors } from '../../api/axiosInstance';
import { format, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import AppointmentCard from './AppointmentCard';

const ReceptionistAppointmentManager = () => {
  const { refreshToken } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('today');
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Use a ref to track if the component is mounted
  const isMounted = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Load doctors once on mount
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const response = await fetchAllDoctors();
        if (isMounted.current) {
          setDoctors(response.data);
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    };
    
    loadDoctors();
    // We only want to run this once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Define loadAppointments function that doesn't recreate on every render
  const loadAppointments = useCallback(async () => {
    // Prevent running if component is unmounted
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      if (error) setError('');
      
      const today = new Date();
      let filters = {};
      
      switch (activeTab) {
        case 'today':
          filters = {
            date_from: format(startOfDay(today), 'yyyy-MM-dd'),
            date_to: format(endOfDay(today), 'yyyy-MM-dd')
          };
          break;
        case 'upcoming':
          filters = {
            date_from: format(addDays(startOfDay(today), 1), 'yyyy-MM-dd')
          };
          break;
        case 'pending':
          filters = {
            status: 'PENDING'
          };
          break;
        default:
          break;
      }
      
      console.log('Fetching appointments with filters:', filters);
      
      const response = await fetchAdminAppointments(filters);
      
      // Only update state if still mounted
      if (isMounted.current) {
        console.log('Appointment response:', response.data);
        setAppointments(response.data);
        setRetryCount(0);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
      
      // Only proceed if component is still mounted
      if (!isMounted.current) return;
      
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        console.log('Authentication error when loading appointments');
        
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        if (newRetryCount > 2) {
          setError('Session expired. Please refresh the page or log in again.');
        } else {
          try {
            await refreshToken();
            // Don't automatically retry here - wait for next user action
          } catch (refreshErr) {
            console.error('Token refresh failed:', refreshErr);
          }
        }
      } else {
        setError('Could not load appointments. Please try again later.');
      }
      
      setAppointments([]);
    } finally {
      // Only update state if still mounted
      if (isMounted.current) {
        setLoading(false);
      }
    }
  // Only depend on activeTab and retryCount
  // Using a stable version of refreshToken would be ideal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, retryCount]);
  
  // Effect to load appointments when tab changes
  useEffect(() => {
    loadAppointments();
    // Only depend on loadAppointments, which itself depends on activeTab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  
  const handleCancelAppointment = async (id) => {
    try {
      setActionInProgress(id);
      await cancelAppointment(id);
      
      // Update the list to reflect the cancellation
      setAppointments(prev => 
        prev.map(appointment => 
          appointment.id === id 
            ? { ...appointment, status: 'CANCELLED', can_modify: false } 
            : appointment
        )
      );
      
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
      setError('Failed to cancel appointment. It may be too close to the appointment time.');
    } finally {
      setActionInProgress(null);
    }
  };
  
  const handleConfirmAppointment = async (id) => {
    try {
      setActionInProgress(id);
      await confirmAppointment(id);
      
      // Update the list to reflect the confirmation
      setAppointments(prev => 
        prev.map(appointment => 
          appointment.id === id 
            ? { ...appointment, status: 'CONFIRMED' } 
            : appointment
        )
      );
      
    } catch (err) {
      console.error('Failed to confirm appointment:', err);
      setError('Failed to confirm appointment. Please try again.');
    } finally {
      setActionInProgress(null);
    }
  };
  
  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
          Appointment Management
        </h1>
        
        <Link 
          to="/book-appointment" 
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Book New Appointment
        </Link>
      </div>
      
      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          <div className="mt-4 flex flex-col space-y-2">
            <Link 
              to="/doctors" 
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              View All Doctors
            </Link>
            <Link 
              to="/book-appointment" 
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule Appointment
            </Link>
            <button 
              onClick={() => {
                // Manual refresh - reset retry count and explicitly load
                setRetryCount(0);
                loadAppointments();
              }} 
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>
        
        {doctors.slice(0, 3).map(doctor => (
          <DoctorAvailabilityCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
      
      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'today'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('today')}
          >
            Today's Appointments
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upcoming'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('pending')}
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
            onClick={() => setError('')}
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Appointments */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800">No appointments found</h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'today' 
                ? "There are no appointments scheduled for today." 
                : activeTab === 'upcoming' 
                ? "There are no upcoming appointments scheduled." 
                : "There are no pending appointments that need confirmation."}
            </p>
            <Link 
              to="/book-appointment" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Schedule New Appointment
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {appointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={
                  appointment.can_modify && appointment.status !== 'CANCELLED' 
                    ? () => handleCancelAppointment(appointment.id) 
                    : null
                }
                onConfirm={
                  appointment.status === 'PENDING' 
                    ? () => handleConfirmAppointment(appointment.id) 
                    : null
                }
                isCancelling={actionInProgress === appointment.id}
                isConfirming={actionInProgress === appointment.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DoctorAvailabilityCard = ({ doctor }) => {
  const isMounted = useRef(true);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    const loadAvailability = async () => {
      // Prevent running if unmounted
      if (!isMounted.current) return;
      
      try {
        setLoading(true);
        setLoadError(false);
        
        const today = format(new Date(), 'yyyy-MM-dd');
        const response = await fetchAvailableSlots(doctor.id, today);
        
        // Only update state if still mounted
        if (isMounted.current) {
          setAvailability(response.data.slots || []);
        }
      } catch (err) {
        console.error('Failed to load availability:', err);
        // Only update state if still mounted
        if (isMounted.current) {
          setLoadError(true);
        }
      } finally {
        // Only update state if still mounted
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    loadAvailability();
    // We only want this to depend on doctor.id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor.id]);
  
  const formatTime = (timeString) => {
    try {
      return format(parseISO(timeString), 'h:mm a');
    } catch (e) {
      return timeString;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
      <div className="flex justify-between items-start">
        <h2 className="text-lg font-medium text-gray-900">
          Dr. {doctor.full_name || `${doctor.first_name} ${doctor.last_name}`}
        </h2>
        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
          {doctor.specialty || 'Doctor'}
        </span>
      </div>
      
      <h3 className="text-sm font-medium text-gray-700 mt-4 mb-2">Today's Availability</h3>
      
      {loading ? (
        <div className="text-center py-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-xs text-gray-500">Loading...</span>
        </div>
      ) : loadError ? (
        <p className="text-sm text-gray-500">Could not load availability</p>
      ) : availability.length === 0 ? (
        <p className="text-sm text-gray-500">No available slots today</p>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {availability.slice(0, 4).map((slot, index) => (
            <div key={index} className="text-xs text-center py-1 px-2 bg-green-50 text-green-800 rounded">
              {formatTime(slot.start)}
            </div>
          ))}
          {availability.length > 4 && (
            <div className="text-xs text-center py-1 px-2 bg-gray-50 text-gray-600 rounded">
              +{availability.length - 4} more
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4">
        <Link 
          to={`/book-appointment/${doctor.id}`}
          className="w-full text-center block px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
        >
          Book Appointment
        </Link>
      </div>
    </div>
  );
};

export default ReceptionistAppointmentManager;