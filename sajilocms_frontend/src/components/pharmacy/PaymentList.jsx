// src/components/pharmacy/PaymentList.jsx
import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../../utils/apiClient';
import { AuthContext } from '../../context/AuthContext';

// Helper function to format currency
const formatCurrency = (amount) => {
  return `NPR ${parseFloat(amount).toFixed(2)}`;
};

// Helper function to format date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Get payment status chip color
const getPaymentStatusColor = (status) => {
  switch(status) {
    case 'SUCCESS': return 'bg-green-100 text-green-800';
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'FAILED': return 'bg-red-100 text-red-800';
    case 'CANCELLED': return 'bg-gray-100 text-gray-800';
    case 'REFUNDED': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Get payment method chip color
const getPaymentMethodColor = (method) => {
  switch(method) {
    case 'CASH': return 'bg-green-100 text-green-800';
    case 'CARD': return 'bg-blue-100 text-blue-800';
    case 'ESEWA': return 'bg-purple-100 text-purple-800';
    case 'KHALTI': return 'bg-indigo-100 text-indigo-800';
    case 'BANK_TRANSFER': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const PaymentList = () => {
  const { user } = useContext(AuthContext);
  const userRole = user?.role || 'PATIENT';
  
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Payment creation dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    payment_method: 'CASH',
    amount: '',
    transaction_id: '',
    notes: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Fetch payments
  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/pharmacy/payments/');
      console.log('Payments response:', response.data);
      setPayments(response.data.results || response.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Failed to load payments. Please try again later.');
      setLoading(false);
    }
  };
  
  // Fetch orders with pending payments
  const fetchPendingOrders = async () => {
    try {
      const response = await apiClient.get('/pharmacy/orders/');
      console.log('Orders response:', response.data);
      
      const pendingOrders = (response.data.results || response.data || []).filter(
        order => order.payment_status === 'PENDING'
      );
      
      setOrders(pendingOrders);
    } catch (err) {
      console.error('Error fetching pending orders:', err);
    }
  };
  
  // Load data on initial render
  useEffect(() => {
    fetchPayments();
    if (userRole !== 'PATIENT') {
      fetchPendingOrders();
    }
  }, [userRole]);
  
  // Handle payment form changes
  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Open payment dialog for an order
  const handleAddPayment = (order) => {
    setSelectedOrder(order);
    setPaymentDetails({
      payment_method: 'CASH',
      amount: order.total_amount,
      transaction_id: '',
      notes: ''
    });
    setShowPaymentDialog(true);
  };
  
  // Process payment
  const processPayment = async () => {
    setProcessingPayment(true);
    setError(null);
    
    try {
      const paymentData = {
        ...paymentDetails,
        order: selectedOrder.id,
        status: 'SUCCESS'
      };
      
      console.log('Sending payment data:', paymentData);
      
      const response = await apiClient.post('/pharmacy/payments/', paymentData);
      console.log('Payment response:', response.data);
      
      setSuccess('Payment processed successfully');
      setShowPaymentDialog(false);
      fetchPayments();
      fetchPendingOrders();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to process payment:', err);
      setError(err.response?.data?.detail || 'Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };
  
  // Filter payments based on search term
  const filteredPayments = payments.filter(payment => 
    payment.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div>
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">
          {userRole === 'PATIENT' ? 'My Payments' : 'Payment & Billing Management'}
        </h2>
      </div>
      
      {/* Success/Error messages */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Search and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {userRole !== 'PATIENT' && (
          <button 
            onClick={fetchPendingOrders}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Pending Orders
          </button>
        )}
      </div>
      
      {/* Pending Orders Section (for pharmacists/admins) */}
      {userRole !== 'PATIENT' && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Awaiting Payment</h3>
          
          {orders.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.order_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.user_name || order.user_email || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.payment_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleAddPayment(order)}
                            className="inline-flex items-center px-3 py-1 border border-blue-300 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Process Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-600">No orders awaiting payment</p>
            </div>
          )}
        </div>
      )}
      
      {/* Payment History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredPayments.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.id?.toString().substring(0, 8) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentMethodColor(payment.payment_method)}`}>
                          {payment.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.transaction_id || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try a different search term' : 'There are no payment records in the system yet'}
            </p>
          </div>
        )}
      </div>
      
      {/* Payment Processing Modal */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Process Payment</h3>
              <button
                onClick={() => setShowPaymentDialog(false)}
                disabled={processingPayment}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {selectedOrder && (
                <div className="space-y-6">
                  {/* Order Details */}
                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-3">Order Details</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Order #:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedOrder.order_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Customer:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedOrder.user_name || selectedOrder.user_email || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Amount:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(selectedOrder.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Form */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method
                      </label>
                      <select
                        name="payment_method"
                        value={paymentDetails.payment_method}
                        onChange={handlePaymentChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Credit/Debit Card</option>
                        <option value="ESEWA">eSewa</option>
                        <option value="KHALTI">Khalti</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">NPR</span>
                        </div>
                        <input
                          name="amount"
                          type="number"
                          value={paymentDetails.amount}
                          onChange={handlePaymentChange}
                          className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transaction ID / Reference
                      </label>
                      <input
                        name="transaction_id"
                        type="text"
                        value={paymentDetails.transaction_id}
                        onChange={handlePaymentChange}
                        placeholder="Optional for cash payments"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={paymentDetails.notes}
                        onChange={handlePaymentChange}
                        rows={3}
                        placeholder="Any additional payment details"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowPaymentDialog(false)}
                disabled={processingPayment}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={processPayment}
                disabled={processingPayment || !paymentDetails.amount}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {processingPayment && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{processingPayment ? 'Processing...' : 'Complete Payment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentList;