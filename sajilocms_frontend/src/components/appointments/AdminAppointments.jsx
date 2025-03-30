// src/components/appointments/AdminAppointments.jsx
import React, { useState, useEffect } from 'react';
import { fetchAdminAppointments, fetchDoctorStats } from '../../api/appointmentService';
import { fetchAllDoctors } from '../../api/axiosInstance';
import AppointmentCard from './AppointmentCard';

const AdminAppointments = () => {
  const [activeTab, setActiveTab] = useState('appointments');
  
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="bg-blue-600 p-6 text-white">
        <h2 className="text-2xl font-bold">Appointment Management</h2>
        <p className="text-blue-100 mt-1">Manage appointments and view doctor statistics</p>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 font-medium text-sm focus:outline-none ${
            activeTab === 'appointments' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments
        </button>
        <button
          className={`flex-1 py-3 font-medium text-sm focus:outline-none ${
            activeTab === 'statistics' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('statistics')}
        >
          Doctor Statistics
        </button>
      </div>
      
      {activeTab === 'appointments' ? (
        <AppointmentList />
      ) : (
        <DoctorStatistics />
      )}
    </div>
  );
};

const AppointmentList = () => {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [doctorFilter, setDoctorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [filterApplied, setFilterApplied] = useState(false);
  
  const loadAppointments = async (useFilters = false) => {
    try {
      setLoading(true);
      setError('');
      
      let filters = {};
      
      if (useFilters) {
        filters = {
          doctor_id: doctorFilter || undefined,
          status: statusFilter || undefined,
          date_from: dateFromFilter || undefined,
          date_to: dateToFilter || undefined
        };
      }
      
      const response = await fetchAdminAppointments(filters);
      setAppointments(response.data);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Could not load appointments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load doctors for filter and initial appointments
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const response = await fetchAllDoctors();
        setDoctors(response.data);
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    };
    
    loadDoctors();
    loadAppointments(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  const handleApplyFilters = () => {
    loadAppointments(true);
    setFilterApplied(true);
  };
  
  const handleClearFilters = () => {
    setDoctorFilter('');
    setStatusFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setFilterApplied(false);
    loadAppointments(false);
  };
  
  return (
    <div>
      {/* Filters */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Appointments</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label htmlFor="doctor-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Doctor
            </label>
            <select
              id="doctor-filter"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">All Doctors</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.full_name || `${doctor.first_name} ${doctor.last_name}`}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="MISSED">Missed</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="date-from-filter" className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              id="date-from-filter"
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="date-to-filter" className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              id="date-to-filter"
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              min={dateFromFilter}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Apply Filters
          </button>
          
          {filterApplied && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {/* Filter Status Banner */}
      {filterApplied && (
        <div className="p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
          Filtered appointments
          {doctorFilter && ' by doctor'}
          {statusFilter && ' by status'}
          {(dateFromFilter || dateToFilter) && ' by date'}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}
      
      {/* Appointments List */}
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
          {filterApplied ? (
            <p className="text-gray-500">Try changing your filter criteria or clear filters</p>
          ) : (
            <p className="text-gray-500">No appointments are scheduled in the system</p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {appointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DoctorStatistics = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterApplied, setFilterApplied] = useState(false);
  
  const loadStats = async (from = null, to = null) => {
    try {
      setLoading(true);
      setError('');
      
      // Only pass date parameters when filter is explicitly applied
      const response = await fetchDoctorStats(from, to);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load doctor statistics:', err);
      setError('Could not load doctor statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Load all stats initially without date filtering
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadStats(dateFrom, dateTo);
    setFilterApplied(true);
  };
  
  const handleClearFilter = () => {
    setDateFrom('');
    setDateTo('');
    loadStats();
    setFilterApplied(false);
  };
  
  const calculateCompletionRate = (doctor) => {
    const total = doctor.total_appointments;
    if (!total) return 0;
    
    const completed = doctor.completed;
    return Math.round((completed / total) * 100);
  };
  
  const calculateCancellationRate = (doctor) => {
    const total = doctor.total_appointments;
    if (!total) return 0;
    
    const cancelled = doctor.cancelled;
    return Math.round((cancelled / total) * 100);
  };
  
  return (
    <div className="p-4">
      {/* Date Filter */}
      <div className="mb-6 bg-gray-50 p-4 rounded-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter by Date Range</h3>
        
        <form onSubmit={handleFilterSubmit} className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div className="flex-1">
            <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full md:w-auto"
            >
              Apply Filter
            </button>
            
            {filterApplied && (
              <button
                type="button"
                onClick={handleClearFilter}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full md:w-auto"
              >
                Clear Filter
              </button>
            )}
          </div>
        </form>
      </div>
      
      {/* Filter Status Banner */}
      {filterApplied && (
        <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
          Showing statistics from {dateFrom} to {dateTo}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}
      
      {/* Statistics Table */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading doctor statistics...</p>
        </div>
      ) : stats.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-md">
          <p className="text-gray-600">
            {filterApplied 
              ? "No statistics available for the selected date range." 
              : "No doctor statistics available."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specialty
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Appts
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cancellation Rate
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status Breakdown
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.map((doctor) => (
                <tr key={doctor.doctor_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{doctor.doctor_name}</div>
                    <div className="text-sm text-gray-500">{doctor.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{doctor.specialty}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">{doctor.total_appointments}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">{calculateCompletionRate(doctor)}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ width: `${calculateCompletionRate(doctor)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">{calculateCancellationRate(doctor)}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                      <div 
                        className="bg-red-500 h-2.5 rounded-full" 
                        style={{ width: `${calculateCancellationRate(doctor)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-center">
                        Pending: {doctor.pending || 0}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-center">
                        Confirmed: {doctor.confirmed || 0}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-center">
                        Completed: {doctor.completed || 0}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-center">
                        Cancelled: {doctor.cancelled || 0}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-center">
                        Missed: {doctor.missed || 0}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminAppointments;