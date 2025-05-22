// src/components/appointments/AvailabilityManagement.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { rootAxiosInstance } from '../../api/axiosInstance';
import { format, parseISO } from 'date-fns';

// Correct API endpoints based on your Django URLs
const AVAILABLE_SLOTS_URL = '/appointment/available-slots/';
const CREATE_SLOT_URL = '/appointment/create-available-slot/';
const TIME_OFF_URL = '/appointment/time-offs/';

const AvailabilityManagement = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('weekly-schedule');
  
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="bg-blue-600 p-6 text-white">
        <h2 className="text-2xl font-bold">Manage Availability</h2>
        <p className="text-blue-100 mt-1">Set your working hours and time off periods</p>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 font-medium text-sm focus:outline-none ${
            activeTab === 'weekly-schedule' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('weekly-schedule')}
        >
          Weekly Schedule
        </button>
        <button
          className={`flex-1 py-3 font-medium text-sm focus:outline-none ${
            activeTab === 'time-off' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('time-off')}
        >
          Time Off
        </button>
      </div>
      
      {activeTab === 'weekly-schedule' ? (
        <WeeklyScheduleTab userId={user.id} />
      ) : (
        <TimeOffTab userId={user.id} />
      )}
    </div>
  );
};

const WeeklyScheduleTab = ({ userId }) => {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [activeDay, setActiveDay] = useState(0); // Monday by default
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [editingSlot, setEditingSlot] = useState(null);
  
  const loadAvailableSlots = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get all available slots for this doctor
      const response = await rootAxiosInstance.get(`${AVAILABLE_SLOTS_URL}?doctor_id=${userId}`);
      
      setAvailableSlots(response.data || []);
    } catch (err) {
      console.error('Failed to load available slots:', err);
      setError('Could not load your availability. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  // Load existing schedule on component mount
  useEffect(() => {
    loadAvailableSlots();
  }, [loadAvailableSlots]);
  
  const handleAddTimeSlot = async () => {
    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }
    
    try {
      setActionLoading(true);
      setError('');
      
      const slotData = {
        doctor_id: userId,
        day_of_week: activeDay,
        start_time: startTime,
        end_time: endTime
      };
      
      // Use the create-available-slot endpoint for better compatibility
      const response = await rootAxiosInstance.post(CREATE_SLOT_URL, slotData);
      
      if (response.data && response.data.success) {
        // Reload the schedule
        await loadAvailableSlots();
        
        // Reset form
        setStartTime('09:00');
        setEndTime('17:00');
        
        setSuccess('Time slot added successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(response.data?.error || 'Failed to add time slot');
      }
    } catch (err) {
      console.error('Failed to add time slot:', err);
      setError(err.response?.data?.error || err.message || 'Failed to add time slot. It may overlap with an existing one.');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleEditSlot = (slot) => {
    setEditingSlot(slot.id);
    setStartTime(slot.start_time.split(':').slice(0, 2).join(':'));
    setEndTime(slot.end_time.split(':').slice(0, 2).join(':'));
  };
  
  const handleUpdateSlot = async () => {
    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }
    
    try {
      setActionLoading(true);
      setError('');
      
      // We'll recreate the slot instead of trying to update it
      // This is more compatible with your backend implementation
      await rootAxiosInstance.delete(`${AVAILABLE_SLOTS_URL}${editingSlot}/`);
      
      const slotData = {
        doctor_id: userId,
        day_of_week: activeDay,
        start_time: startTime,
        end_time: endTime
      };
      
      await rootAxiosInstance.post(CREATE_SLOT_URL, slotData);
      
      // Reload the slots
      await loadAvailableSlots();
      
      // Reset form
      setEditingSlot(null);
      setStartTime('09:00');
      setEndTime('17:00');
      
      setSuccess('Time slot updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update time slot:', err);
      setError(err.response?.data?.error || 'Failed to update time slot.');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this time slot?')) {
      return;
    }
    
    try {
      setActionLoading(true);
      setError('');
      
      await rootAxiosInstance.delete(`${AVAILABLE_SLOTS_URL}${slotId}/`);
      
      // Reload the slots
      await loadAvailableSlots();
      
      setSuccess('Time slot deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to delete time slot:', err);
      setError(err.response?.data?.error || 'Failed to delete time slot.');
    } finally {
      setActionLoading(false);
    }
  };
  
  const getSlotsByDay = (day) => {
    return availableSlots.filter(slot => slot.day_of_week === day);
  };
  
  return (
    <div className="p-6">
      {/* Loading State */}
      {loading && (
        <div className="text-center py-4 mb-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading availability data...</p>
        </div>
      )}
      
      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700">
          {success}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {editingSlot ? 'Edit Time Slot' : 'Add Available Time Slot'}
        </h3>
        
        {/* Day Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Day</label>
          <div className="flex flex-wrap gap-2">
            {dayNames.map((day, index) => (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(index)}
                className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  activeDay === index
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        
        {/* Time Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
        
        {editingSlot ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUpdateSlot}
              disabled={actionLoading}
              className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                actionLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {actionLoading ? 'Updating...' : 'Update Time Slot'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingSlot(null);
                setStartTime('09:00');
                setEndTime('17:00');
              }}
              disabled={actionLoading}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        ) : (
            <button
            type="button"
            onClick={handleAddTimeSlot}
            disabled={actionLoading}
            className={`px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 text-sm font-medium ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {actionLoading ? 'Adding...' : 'Add Time Slot'}
          </button>
        )}
      </div>
      
      {/* Current Schedule */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Time Slots</h3>
        
        {!loading && availableSlots.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-md">
            <p className="text-gray-600">You haven't set any available time slots yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dayNames.map((day, index) => {
              const slots = getSlotsByDay(index);
              
              return (
                <div key={day} className="border border-gray-200 rounded-md p-4">
                  <h4 className="font-medium text-gray-800">{day}</h4>
                  
                  {slots.length === 0 ? (
                    <p className="text-sm text-gray-500 mt-2">No time slots set for this day</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {slots.map((slot) => (
                        <li key={slot.id} className="flex justify-between items-center text-sm text-gray-600">
                          <span>{slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}</span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setActiveDay(slot.day_of_week);
                                handleEditSlot(slot);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const TimeOffTab = ({ userId }) => {
  const [timeOffs, setTimeOffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [editingTimeOff, setEditingTimeOff] = useState(null);
  
  // Add useCallback for timeOffs
  const loadTimeOffs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await rootAxiosInstance.get(TIME_OFF_URL);
      setTimeOffs(response.data);
    } catch (err) {
      console.error('Failed to load time offs:', err);
      setError('Could not load your time off records.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadTimeOffs();
  }, [loadTimeOffs]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      setError('Start and end dates are required');
      return;
    }
    
    // Combine date and time
    const startDateTime = `${startDate}T${startTime}:00`;
    const endDateTime = `${endDate}T${endTime}:00`;
    
    if (new Date(startDateTime) >= new Date(endDateTime)) {
      setError('End time must be after start time');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      const timeOffData = {
        start_time: startDateTime,
        end_time: endDateTime,
        reason: reason
      };
      
      let response;
      
      if (editingTimeOff) {
        // Update existing time off
        response = await rootAxiosInstance.put(`${TIME_OFF_URL}${editingTimeOff}/`, timeOffData);
        
        // Update the time off in the list
        setTimeOffs(prev => prev.map(item => 
          item.id === editingTimeOff ? response.data : item
        ));
        
        setSuccess('Time off request updated successfully!');
      } else {
        // Create new time off
        response = await rootAxiosInstance.post(TIME_OFF_URL, timeOffData);
        
        // Add the new time off to the list
        setTimeOffs(prev => [response.data, ...prev]);
        
        setSuccess('Time off request submitted successfully!');
      }
      
      // Reset form
      setEditingTimeOff(null);
      setStartDate('');
      setStartTime('09:00');
      setEndDate('');
      setEndTime('17:00');
      setReason('');
      
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Failed to submit time off request:', err);
      setError(err.response?.data?.error || 'Failed to submit time off request.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleEditTimeOff = (timeOff) => {
    if (timeOff.is_approved) {
      setError("Approved time off requests cannot be edited.");
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    setEditingTimeOff(timeOff.id);
    
    // Parse dates and times from the timeOff object
    const startDateTime = new Date(timeOff.start_time);
    const endDateTime = new Date(timeOff.end_time);
    
    // Format date as YYYY-MM-DD for the date input
    const formatDateForInput = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    // Format time as HH:MM for the time input
    const formatTimeForInput = (date) => {
      return date.toTimeString().slice(0, 5);
    };
    
    setStartDate(formatDateForInput(startDateTime));
    setStartTime(formatTimeForInput(startDateTime));
    setEndDate(formatDateForInput(endDateTime));
    setEndTime(formatTimeForInput(endDateTime));
    setReason(timeOff.reason || '');
  };
  
  const handleDeleteTimeOff = async (timeOffId) => {
    // Get the timeOff object
    const timeOff = timeOffs.find(item => item.id === timeOffId);
    
    if (timeOff.is_approved) {
      setError("Approved time off requests cannot be deleted.");
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this time off request?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      await rootAxiosInstance.delete(`${TIME_OFF_URL}${timeOffId}/`);
      
      // Remove the time off from the list
      setTimeOffs(prev => prev.filter(item => item.id !== timeOffId));
      
      setSuccess('Time off request deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Failed to delete time off request:', err);
      setError(err.response?.data?.error || 'Failed to delete time off request.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingTimeOff(null);
    setStartDate('');
    setStartTime('09:00');
    setEndDate('');
    setEndTime('17:00');
    setReason('');
  };
  
  const formatDateTime = (dateTimeStr) => {
    try {
      const dateTime = parseISO(dateTimeStr);
      return format(dateTime, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateTimeStr;
    }
  };
  
  return (
    <div className="p-6">
      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700">
          {success}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}
      
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {editingTimeOff ? 'Edit Time Off Request' : 'Request Time Off'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || format(new Date(), 'yyyy-MM-dd')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason (optional)
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows="3"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Please provide a reason for your time off request"
            ></textarea>
          </div>
          
          {editingTimeOff ? (
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  submitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {submitting ? 'Updating...' : 'Update Time Off Request'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className={`px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 text-sm font-medium ${
                submitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Time Off Request'}
            </button>
          )}
        </form>
      </div>
      
      {/* Current Time Off Requests */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Your Time Off Requests</h3>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading your time off requests...</p>
          </div>
        ) : timeOffs.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-md">
            <p className="text-gray-600">You don't have any time off requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {timeOffs.map((timeOff) => (
              <div key={timeOff.id} className="border border-gray-200 rounded-md p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        timeOff.is_approved 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {timeOff.is_approved ? 'Approved' : 'Pending Approval'}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        Requested on {format(parseISO(timeOff.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-gray-800">
                        <strong>From:</strong> {formatDateTime(timeOff.start_time)}
                      </p>
                      <p className="text-gray-800">
                        <strong>To:</strong> {formatDateTime(timeOff.end_time)}
                      </p>
                    </div>
                    
                    {timeOff.reason && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          <strong>Reason:</strong> {timeOff.reason}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons, only for pending requests */}
                  {!timeOff.is_approved && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditTimeOff(timeOff)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTimeOff(timeOff.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailabilityManagement;