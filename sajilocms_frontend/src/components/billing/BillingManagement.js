import React, { useState, useEffect } from 'react';
import { fetchBills, markBillAsPaid } from '../../api/billingService';
import { toast } from 'react-toastify';

const BillingManagement = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [processingId, setProcessingId] = useState(null);
  
  useEffect(() => {
    const loadBills = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Set filters based on activeTab
        let filters = {};
        if (activeTab === 'pending') {
          filters.status = 'PENDING';
        } else if (activeTab === 'paid') {
          filters.status = 'PAID';
        }
        
        const response = await fetchBills(filters);
        if (response && response.data) {
          setBills(response.data);
        } else {
          setBills([]);
          setError('No bills found or invalid response format.');
        }
      } catch (err) {
        console.error('Failed to load bills:', err);
        setBills([]);
        setError('Could not load billing information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadBills();
  }, [activeTab]);
  
  const handleMarkAsPaid = async (billId) => {
    try {
      setProcessingId(billId);
      await markBillAsPaid(billId, { 
        payment_method: 'CASH',
        notes: 'Marked as paid by staff' 
      });
      
      // Update the local state
      setBills(bills.map(bill => 
        bill.id === billId 
          ? { ...bill, status: 'PAID', payment_method: 'CASH' } 
          : bill
      ));
      
      toast.success('Payment marked as completed');
    } catch (err) {
      console.error('Failed to mark bill as paid:', err);
      setError('Failed to update payment status. Please try again.');
      toast.error('Failed to update payment status');
    } finally {
      setProcessingId(null);
    }
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="bg-blue-600 p-6 text-white">
        <h2 className="text-2xl font-bold">Billing Management</h2>
        <p className="text-blue-100 mt-1">Track and manage appointment payments</p>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 font-medium text-sm ${
            activeTab === 'pending' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Payments
        </button>
        <button
          className={`flex-1 py-3 font-medium text-sm ${
            activeTab === 'paid' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('paid')}
        >
          Paid
        </button>
        <button
          className={`flex-1 py-3 font-medium text-sm ${
            activeTab === 'all' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('all')}
        >
          All Payments
        </button>
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
      
      {/* Bills Table */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading bills...</p>
        </div>
      ) : bills.length === 0 ? (
        <div className="p-8 text-center">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800">No bills found</h3>
          <p className="text-gray-500">
            {activeTab === 'pending' 
              ? "There are no pending payments." 
              : activeTab === 'paid' 
              ? "There are no paid bills." 
              : "There are no bills in the system."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {bill.appointment_details.patient_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {bill.appointment_details.doctor_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(bill.appointment_details.appointment_time).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(bill.appointment_details.appointment_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      NPR {parseFloat(bill.amount).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      bill.status === 'PAID' 
                        ? 'bg-green-100 text-green-800'
                        : bill.status === 'PENDING' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : bill.status === 'REFUNDED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {bill.payment_method === 'STRIPE' 
                        ? 'Online Payment'
                        : bill.payment_method === 'CASH' 
                        ? 'Cash'
                        : bill.payment_method === 'INSURANCE'
                        ? 'Insurance'
                        : 'Pay Later'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {bill.status === 'PENDING' && (
                      <button
                        onClick={() => handleMarkAsPaid(bill.id)}
                        disabled={processingId === bill.id}
                        className={`text-green-600 hover:text-green-900 ${
                          processingId === bill.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {processingId === bill.id ? 'Processing...' : 'Mark as Paid'}
                      </button>
                    )}
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

export default BillingManagement;
