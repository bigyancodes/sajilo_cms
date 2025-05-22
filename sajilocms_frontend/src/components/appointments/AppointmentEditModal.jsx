import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';

const AppointmentEditModal = ({ 
  appointment, 
  doctors, 
  onUpdate, 
  onCancel,
  isUpdating
}) => {
  const [formData, setFormData] = useState({
    appointment_time: '',
    doctor: '',
    reason: '',
    notes: ''
  });
  
  useEffect(() => {
    if (appointment) {
      // Format the date and time for the input field
      const dateTime = appointment.appointment_time 
        ? format(parseISO(appointment.appointment_time), "yyyy-MM-dd'T'HH:mm")
        : '';
      
      setFormData({
        appointment_time: dateTime,
        doctor: appointment.doctor?.id || '',
        reason: appointment.reason || '',
        notes: appointment.notes || ''
      });
    }
  }, [appointment]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare data for API
    const updatedData = {
      appointment_time: formData.appointment_time,
      reason: formData.reason,
      notes: formData.notes
    };
    
    // Only include doctor if it was changed
    if (formData.doctor && formData.doctor !== (appointment.doctor?.id || '')) {
      updatedData.doctor = formData.doctor;
    }
    
    onUpdate(updatedData);
  };
  
  if (!appointment) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Edit Appointment</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="appointment_time">
              Date and Time
            </label>
            <input
              type="datetime-local"
              id="appointment_time"
              name="appointment_time"
              value={formData.appointment_time}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="doctor">
              Doctor
            </label>
            <select
              id="doctor"
              name="doctor"
              value={formData.doctor}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">Select a doctor</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.full_name || doctor.username}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="reason">
              Reason
            </label>
            <input
              type="text"
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              rows="3"
            ></textarea>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                isUpdating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUpdating ? 'Updating...' : 'Update Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentEditModal;
