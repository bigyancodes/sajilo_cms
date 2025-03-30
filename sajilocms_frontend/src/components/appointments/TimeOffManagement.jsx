// src/components/appointments/TimeOffManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchTimeOffs, 
  approveTimeOff, 
  getPendingTimeOffs 
} from '../../api/appointmentService';
import { format, parseISO } from 'date-fns';

const TimeOffManagement = () => {
  const [timeOffs, setTimeOffs] = useState([]);
  const [pendingTimeOffs, setPendingTimeOffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Define loadTimeOffRequests with useCallback
  const loadTimeOffRequests = useCallback(async () => {
    try {
      if (activeTab === 'pending') {
        setPendingLoading(true);
        const response = await getPendingTimeOffs();
        setPendingTimeOffs(response.data);
        setPendingLoading(false);
      } else {
        setLoading(true);
        const response = await fetchTimeOffs();
        setTimeOffs(response.data);
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load time off requests:', err);
      setError('Could not load time off requests. Please try again later.');
      if (activeTab === 'pending') {
        setPendingLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [activeTab]); // Include activeTab as a dependency
  
  // Load time off requests based on active tab
  useEffect(() => {
    loadTimeOffRequests();
  }, [loadTimeOffRequests]); // Now correctly includes loadTimeOffRequests
  
  const handleApprove = async (id) => {
    try {
      setActionInProgress(id);
      setError('');
      
      await approveTimeOff(id);
      
      // Show success message
      setSuccess('Time off request approved successfully');
      
      // Refresh the lists
      loadTimeOffRequests();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Failed to approve time off request:', err);
      setError('Failed to approve time off request. Please try again.');
    } finally {
      setActionInProgress(null);
    }
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
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="bg-blue-600 p-6 text-white">
        <h2 className="text-2xl font-bold">Time Off Management</h2>
        <p className="text-blue-100 mt-1">Manage and approve time off requests</p>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 font-medium text-sm focus:outline-none ${
            activeTab === 'pending' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Approval
        </button>
        <button
          className={`flex-1 py-3 font-medium text-sm focus:outline-none ${
            activeTab === 'all' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('all')}
        >
          All Time Off
        </button>
      </div>
      
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
            <button 
              className="ml-2 text-red-800 underline" 
              onClick={() => setError('')}
            >
              Dismiss
            </button>
          </div>
        )}
        
        {/* Pending Time Off Requests */}
        {activeTab === 'pending' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Time Off Requests</h3>
            
            {pendingLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-600">Loading pending requests...</p>
              </div>
            ) : pendingTimeOffs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-md">
                <p className="text-gray-600">No pending time off requests.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTimeOffs.map((timeOff) => (
                  <div key={timeOff.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {timeOff.doctor_name}
                        </h4>
                        
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
                        
                        <p className="text-sm text-gray-500 mt-2">
                          Requested on {format(parseISO(timeOff.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      
                      <div className="mt-4 md:mt-0">
                        <button
                          onClick={() => handleApprove(timeOff.id)}
                          disabled={actionInProgress === timeOff.id}
                          className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                            actionInProgress === timeOff.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {actionInProgress === timeOff.id ? 'Approving...' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* All Time Off Requests */}
        {activeTab === 'all' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">All Time Off Requests</h3>
            
            <div className="mb-4">
              <button
                onClick={loadTimeOffRequests}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Refresh List
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-600">Loading time off requests...</p>
              </div>
            ) : timeOffs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-md">
                <p className="text-gray-600">No time off requests found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {timeOffs.map((timeOff) => (
                  <div key={timeOff.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <h4 className="font-medium text-gray-900 mr-2">
                            {timeOff.doctor_name}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            timeOff.is_approved 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {timeOff.is_approved ? 'Approved' : 'Pending Approval'}
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
                        
                        <p className="text-sm text-gray-500 mt-2">
                          Requested on {format(parseISO(timeOff.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      
                      {!timeOff.is_approved && (
                        <div>
                          <button
                            onClick={() => handleApprove(timeOff.id)}
                            disabled={actionInProgress === timeOff.id}
                            className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                              actionInProgress === timeOff.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {actionInProgress === timeOff.id ? 'Approving...' : 'Approve'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeOffManagement;