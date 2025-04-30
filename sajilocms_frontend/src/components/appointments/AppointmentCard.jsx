import React from 'react';
import { getDateAndTime } from '../../utils/dateUtils';

const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800';
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800';
    case 'MISSED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

const AppointmentCard = ({ 
  appointment, 
  onCancel, 
  onConfirm, 
  onComplete, 
  isCancelling = false,
  isConfirming = false,
  isCompleting = false,
  isPatientView = false,
  isDoctorView = false
}) => {
  // Use the utility function for consistent formatting
  const { date, time } = getDateAndTime(appointment.appointment_time);

  return (
    <div className="p-6 hover:bg-gray-50">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(appointment.status)}`}>
              {capitalizeFirstLetter(appointment.status)}
            </span>
            <span className="ml-2 text-sm text-gray-500">
              {appointment.id.substring(0, 8)}
            </span>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mt-2">
            {isPatientView ? (
              <>{appointment.doctor_name}</>
            ) : (
              <>{appointment.patient_name || 'Patient'}</>
            )}
          </h3>
          
          <div className="flex items-center mt-1 text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{date}</span>
            <span className="mx-2">•</span>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{time}</span>
          </div>
          
          {appointment.reason && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">{appointment.reason}</p>
            </div>
          )}
          
          {appointment.notes && (
            <div className="mt-2 p-2 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">{appointment.notes}</p>
            </div>
          )}
        </div>
        
        <div className="space-y-2 md:space-y-0 md:space-x-2 flex flex-col md:flex-row">
          {appointment.can_modify && appointment.status !== 'CANCELLED' && onCancel && (
            <button
              onClick={onCancel}
              disabled={isCancelling}
              className={`px-3 py-1 border border-red-300 text-red-700 rounded-md text-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                isCancelling ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
          
          {isDoctorView && appointment.status === 'PENDING' && onConfirm && (
            <button
              onClick={onConfirm}
              disabled={isConfirming}
              className={`px-3 py-1 border border-green-300 text-green-700 rounded-md text-sm hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                isConfirming ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isConfirming ? 'Confirming...' : 'Confirm'}
            </button>
          )}
          
          {isDoctorView && ['PENDING', 'CONFIRMED'].includes(appointment.status) && onComplete && (
            <button
              onClick={onComplete}
              disabled={isCompleting}
              className={`px-3 py-1 border border-blue-300 text-blue-700 rounded-md text-sm hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isCompleting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isCompleting ? 'Completing...' : 'Complete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;