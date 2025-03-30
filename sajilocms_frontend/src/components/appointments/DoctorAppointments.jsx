// src/components/appointments/DoctorAppointments.jsx
import React, { useState, useEffect } from 'react';
import { 
  fetchDoctorAppointments,
  cancelAppointment,
  confirmAppointment,
  completeAppointment
} from '../../api/appointmentService';
import AppointmentCard from './AppointmentCard';

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);
  
  useEffect(() => {
    loadAppointments();
  }, [activeTab, statusFilter]);
  
  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetchDoctorAppointments(activeTab, statusFilter);
      setAppointments(response.data);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Could not load your appointments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelAppointment = async (id) => {
    try {
      setActionInProgress(id);
      await cancelAppointment(id);
      
      // Update the list to reflect the cancellation
      setAppointments(prev => 
        prev.map(appointment => 
          appointment.id === id 
            ? { ...appointment, status: 'CANCELLED' } 
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
  
  const handleCompleteAppointment = async (id) => {
    try {
      setActionInProgress(id);
      await completeAppointment(id);
      
      // Update the list to reflect completion
      setAppointments(prev => 
        prev.map(appointment => 
          appointment.id === id 
            ? { ...appointment, status: 'COMPLETED' } 
            : appointment
        )
      );
      
    } catch (err) {
      console.error('Failed to complete appointment:', err);
      setError('Failed to mark appointment as completed. Please try again.');
    } finally {
      setActionInProgress(null);
    }
  };
  
  const getStatusFilterOptions = () => {
    const options = [
      { value: '', label: 'All Statuses' },
      { value: 'PENDING', label: 'Pending' },
      { value: 'CONFIRMED', label: 'Confirmed' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'CANCELLED', label: 'Cancelled' }
    ];
    
    // Only show "MISSED" option for past appointments
    if (activeTab === 'past') {
      options.push({ value: 'MISSED', label: 'Missed' });
    }
    
    return options;
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="bg-blue-600 p-6 text-white">
        <h2 className="text-2xl font-bold">My Patient Appointments</h2>
        <p className="text-blue-100 mt-1">Manage your scheduled appointments</p>
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
      
      {/* Filters */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="max-w-xs">
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {getStatusFilterOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
          <button 
            className="ml-2 text-red-800 underline" 
            onClick={() => setError('')}
          >
            Dismiss
          </button>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800">
            No {statusFilter ? statusFilter.toLowerCase() : ''} {activeTab} appointments
          </h3>
          <p className="text-gray-500">
            {activeTab === 'upcoming' 
              ? 'You don\'t have any scheduled appointments for this period.' 
              : 'No past appointments found with the current filters.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {appointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onCancel={
                ['PENDING', 'CONFIRMED'].includes(appointment.status) && appointment.can_modify 
                  ? () => handleCancelAppointment(appointment.id) 
                  : null
              }
              onConfirm={
                appointment.status === 'PENDING' 
                  ? () => handleConfirmAppointment(appointment.id) 
                  : null
              }
              onComplete={
                ['PENDING', 'CONFIRMED'].includes(appointment.status) 
                  ? () => handleCompleteAppointment(appointment.id) 
                  : null
              }
              isCancelling={actionInProgress === appointment.id}
              isConfirming={actionInProgress === appointment.id}
              isCompleting={actionInProgress === appointment.id}
              isDoctorView={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;