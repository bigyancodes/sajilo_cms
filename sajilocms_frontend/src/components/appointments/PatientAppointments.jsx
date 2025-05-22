import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchPatientAppointments, cancelAppointment, updateAppointment } from '../../api/appointmentService';
import { fetchAllDoctors } from '../../api/doctorService';
import AppointmentCard from './AppointmentCard';
import PatientAppointmentEditModal from './PatientAppointmentEditModal';

const PatientAppointments = ({ viewType, hideHeader }) => {
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(viewType || 'upcoming');
  const [cancellingId, setCancellingId] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);

  // Update activeTab when viewType prop changes
  useEffect(() => {
    if (viewType) {
      setActiveTab(viewType);
    }
  }, [viewType]);

  // Load doctors for the edit modal
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        // Use the correct API endpoint with error handling
        const response = await fetchAllDoctors();
        if (response && response.data) {
          setDoctors(response.data);
          console.log('Doctors loaded successfully:', response.data);
        } else {
          console.error('No doctor data returned from API');
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
        // Don't set doctors to empty array on error to avoid UI issues
      }
    };
    
    loadDoctors();
  }, []);

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
    console.log('Refreshing appointments after location change:', location.pathname);
  }, [loadAppointments, location.pathname]); // Refresh when location changes or loadAppointments changes
  
  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setShowEditModal(true);
  };

  const handleUpdateAppointment = async (updatedData) => {
    try {
      setActionInProgress(editingAppointment.id);
      await updateAppointment(editingAppointment.id, updatedData);
      
      // Update the list to reflect the changes
      setAppointments(prev => 
        prev.map(appointment => 
          appointment.id === editingAppointment.id 
            ? { ...appointment, ...updatedData } 
            : appointment
        )
      );
      
      setShowEditModal(false);
      setEditingAppointment(null);
      
    } catch (err) {
      console.error('Failed to update appointment:', err);
      setError('Failed to update appointment. Please try again.');
    } finally {
      setActionInProgress(null);
    }
  };

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
      {showEditModal && editingAppointment && (
        <PatientAppointmentEditModal
          appointment={editingAppointment}
          doctors={doctors}
          onUpdate={handleUpdateAppointment}
          onCancel={() => {
            setShowEditModal(false);
            setEditingAppointment(null);
          }}
          isUpdating={actionInProgress === editingAppointment.id}
        />
      )}
      
      {!hideHeader && (
        <>
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
        </>
      )}
      
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
              onCancel={
                appointment.can_modify && !['CANCELLED', 'MISSED', 'COMPLETED'].includes(appointment.status)
                  ? () => handleCancelAppointment(appointment.id)
                  : null
              }
              onEdit={
                appointment.can_modify && ['PENDING', 'CONFIRMED'].includes(appointment.status)
                  ? () => handleEditAppointment(appointment)
                  : null
              }
              isCancelling={cancellingId === appointment.id}
              isEditing={actionInProgress === appointment.id}
              isPatientView={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Set default props
PatientAppointments.defaultProps = {
  viewType: 'upcoming',
  hideHeader: false
};

export default PatientAppointments;