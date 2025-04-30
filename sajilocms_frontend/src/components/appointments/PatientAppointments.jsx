import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchPatientAppointments, cancelAppointment } from '../../api/appointmentService';
import AppointmentCard from './AppointmentCard';

const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancellingId, setCancellingId] = useState(null);

  // Memoize loadAppointments with useCallback
  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetchPatientAppointments(activeTab);
      setAppointments(response.data);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Could not load your appointments. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]); // activeTab is a dependency of loadAppointments

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]); // Only depends on the memoized loadAppointments

  const handleCancelAppointment = async (id) => {
    try {
      setCancellingId(id);
      await cancelAppointment(id);
      
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
      setCancellingId(null);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="bg-blue-600 p-6 text-white">
        <h2 className="text-2xl font-bold">My Appointments</h2>
        <p className="text-blue-100 mt-1">Manage your upcoming and past appointments</p>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 font-medium text-sm focus:outline-none ${
            activeTab === 'upcoming' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
        </button>
        <button
          className={`flex-1 py-3 font-medium text-sm focus:outline-none ${
            activeTab === 'past' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('past')}
        >
          Past
        </button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}
      
      {/* Loading State */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-8 text-center">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V}};3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800">No {activeTab} appointments</h3>
          {activeTab === 'upcoming' ? (
            <>
              <p className="text-gray-500 mb-4">You don't have any scheduled appointments.</p>
              <Link to="/doctors" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Book an Appointment
              </Link>
            </>
          ) : (
            <p className="text-gray-500">You don't have any past appointment records.</p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {appointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onCancel={() => handleCancelAppointment(appointment.id)}
              isCancelling={cancellingId === appointment.id}
              isPatientView={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientAppointments;