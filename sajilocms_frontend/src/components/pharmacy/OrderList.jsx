// src/components/pharmacy/OrderList.jsx
import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../../utils/apiClient';
import { AuthContext } from '../../context/AuthContext';

// Helper functions for status colors
const getStatusColor = (status) => {
  switch(status) {
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
    case 'PROCESSING': return 'bg-purple-100 text-purple-800';
    case 'READY': return 'bg-green-100 text-green-800';
    case 'SHIPPED': return 'bg-indigo-100 text-indigo-800';
    case 'DELIVERED': return 'bg-green-100 text-green-800';
    case 'CANCELLED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPaymentStatusColor = (status) => {
  switch(status) {
    case 'PAID': return 'bg-green-100 text-green-800';
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'FAILED': return 'bg-red-100 text-red-800';
    case 'REFUNDED': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Format date helper
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Format currency helper
const formatCurrency = (amount) => {
  return `NPR ${amount}`;
};

// Order tracking component
const OrderTracking = ({ status }) => {
  const steps = [
    { status: 'PENDING', label: 'Pending', icon: '📋' },
    { status: 'CONFIRMED', label: 'Confirmed', icon: '✅' },
    { status: 'PROCESSING', label: 'Processing', icon: '⚙️' },
    { status: 'READY', label: 'Ready', icon: '📦' },
    { status: 'SHIPPED', label: 'Shipped', icon: '🚚' },
    { status: 'DELIVERED', label: 'Delivered', icon: '✅' }
  ];
  
  const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'DELIVERED'];
  const currentIndex = statusOrder.indexOf(status);
  
  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>
        <div 
          className="absolute top-5 left-0 h-0.5 bg-blue-500 z-0 transition-all duration-300"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        ></div>
        
        {steps.map((step, index) => {
          const stepIndex = statusOrder.indexOf(step.status);
          const isCompleted = stepIndex <= currentIndex;
          const isActive = step.status === status;
          
          return (
            <div key={step.status} className="flex flex-col items-center relative z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm border-2 ${
                isCompleted 
                  ? isActive 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {step.icon}
              </div>
              <span className={`mt-2 text-xs font-medium ${
                isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Status message */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          {status === 'PENDING' && 'Your order has been received and is awaiting confirmation.'}
          {status === 'CONFIRMED' && 'Your order has been confirmed and will be processed soon.'}
          {status === 'PROCESSING' && 'Your order is being prepared by our pharmacy team.'}
          {status === 'READY' && 'Your order is ready for pickup or delivery.'}
          {status === 'SHIPPED' && 'Your order is on the way to your delivery address.'}
          {status === 'DELIVERED' && 'Your order has been delivered successfully.'}
          {status === 'CANCELLED' && 'This order has been cancelled.'}
        </p>
      </div>
    </div>
  );
};

// Order row component with expandable details
const OrderRow = ({ order, userRole, onUpdateStatus, onProcessPayment }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Order header */}
      <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="text-gray-400 hover:text-gray-600">
              <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{order.order_number}</h3>
              <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="flex space-x-2 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                  {order.payment_status}
                </span>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(order.total_amount)}
              </div>
            </div>
            
            {userRole !== 'PATIENT' && (
              <div className="flex space-x-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(order.id);
                  }}
                  className="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                >
                  Update Status
                </button>
                
                {order.payment_status === 'PENDING' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onProcessPayment(order);
                    }}
                    className="px-3 py-1 text-sm font-medium text-green-600 border border-green-300 rounded-md hover:bg-green-50"
                  >
                    Process Payment
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Expandable order details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="space-y-6">
            {/* Order Tracking */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Status Tracking</h4>
              <OrderTracking status={order.status} />
            </div>
            
            {/* Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <h5 className="text-sm font-medium text-gray-500">Delivery Type</h5>
                <p className="mt-1 text-sm text-gray-900">{order.delivery_type}</p>
              </div>
              
              {order.delivery_type === 'DELIVERY' && (
                <>
                  <div>
                    <h5 className="text-sm font-medium text-gray-500">Delivery Address</h5>
                    <p className="mt-1 text-sm text-gray-900">{order.delivery_address || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-500">Contact Phone</h5>
                    <p className="mt-1 text-sm text-gray-900">{order.delivery_phone || 'N/A'}</p>
                  </div>
                  
                  {order.delivery_notes && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-500">Notes</h5>
                      <p className="mt-1 text-sm text-gray-900">{order.delivery_notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Order Items */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Items</h4>
              
              <div className="bg-white rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicine</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(order.items || []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.medicine_name}</div>
                            <div className="text-sm text-gray-500">({item.medicine_strength})</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          NPR {item.unit_price}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          NPR {item.total_price}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Summary rows */}
                    <tr className="bg-gray-50">
                      <td colSpan="3" className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        Subtotal
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        NPR {order.subtotal}
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td colSpan="3" className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        Tax
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        NPR {order.tax_amount}
                      </td>
                    </tr>
                    {order.delivery_fee > 0 && (
                      <tr className="bg-gray-50">
                        <td colSpan="3" className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          Delivery Fee
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">
                          NPR {order.delivery_fee}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-gray-100">
                      <td colSpan="3" className="px-6 py-4 text-right text-lg font-semibold text-gray-900">
                        Total
                      </td>
                      <td className="px-6 py-4 text-right text-lg font-semibold text-gray-900">
                        NPR {order.total_amount}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main order list component
const OrderList = () => {
  const { user } = useContext(AuthContext);
  const userRole = user?.role || 'PATIENT';
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Update order status dialog
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Payment dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    payment_method: 'CASH',
    amount: '',
    transaction_id: '',
    notes: ''
  });
  
  const tabs = [
    { id: 0, label: 'All Orders', statuses: null },
    { id: 1, label: 'Pending', statuses: ['PENDING'] },
    { id: 2, label: 'Processing', statuses: ['CONFIRMED', 'PROCESSING'] },
    { id: 3, label: 'Ready/Shipped', statuses: ['READY', 'SHIPPED'] },
    { id: 4, label: 'Delivered', statuses: ['DELIVERED'] },
    { id: 5, label: 'Cancelled', statuses: ['CANCELLED'] }
  ];
  
  // Status options based on role
  const getStatusOptions = () => {
    return userRole === 'ADMIN' 
      ? ['CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED']
      : ['CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'DELIVERED'];
  };
  
  // Fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/pharmacy/orders/');
      let allOrders = response.data.results || response.data || [];
      
      // Apply client-side filtering
      if (tabs[activeTab].statuses) {
        allOrders = allOrders.filter(order => 
          tabs[activeTab].statuses.includes(order.status)
        );
      }
      
      setOrders(allOrders);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again later.');
      setLoading(false);
    }
  };
  
  // Load orders on initial render and when tab changes
  useEffect(() => {
    fetchOrders();
  }, [activeTab]);
  
  // Open update status dialog
  const handleUpdateClick = (orderId) => {
    setSelectedOrderId(orderId);
    setNewStatus('');
    setShowUpdateDialog(true);
  };
  
  // Open payment dialog
  const handlePaymentClick = (order) => {
    setSelectedOrderId(order.id);
    setPaymentDetails({
      payment_method: 'CASH',
      amount: order.total_amount,
      transaction_id: '',
      notes: ''
    });
    setShowPaymentDialog(true);
  };
  
  // Update order status
  const confirmStatusUpdate = async () => {
    setUpdateLoading(true);
    try {
      await apiClient.patch(`/pharmacy/orders/${selectedOrderId}/`, {
        status: newStatus
      });
      setSuccess('Order status updated successfully');
      setShowUpdateDialog(false);
      fetchOrders();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update order status');
      setTimeout(() => setError(null), 3000);
    } finally {
      setUpdateLoading(false);
    }
  };
  
  // Process payment
  const processPayment = async () => {
    setUpdateLoading(true);
    setError(null);
    
    try {
      const paymentData = {
        order: selectedOrderId,
        payment_method: paymentDetails.payment_method,
        amount: paymentDetails.amount,
        transaction_id: paymentDetails.transaction_id || '',
        notes: paymentDetails.notes || '',
        status: 'SUCCESS'
      };
      
      await apiClient.post('/pharmacy/payments/', paymentData);
      
      await apiClient.patch(`/pharmacy/orders/${selectedOrderId}/`, {
        payment_status: 'PAID'
      });
      
      setSuccess('Payment processed successfully');
      setShowPaymentDialog(false);
      fetchOrders();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to process payment:', err);
      setError(err.response?.data?.detail || 'Failed to process payment. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setUpdateLoading(false);
    }
  };
  
  return (
    <div>
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">
          {userRole === 'PATIENT' ? 'My Orders' : 'Order Management'}
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
      
      {/* Status filter tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderRow 
              key={order.id} 
              order={order} 
              userRole={userRole}
              onUpdateStatus={handleUpdateClick}
              onProcessPayment={handlePaymentClick}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600 mb-4">
            {activeTab === 0 
              ? "You haven't placed any orders yet." 
              : "No orders with this status."}
          </p>
          {userRole === 'PATIENT' && (
            <a 
              href="/patient/pharmacy"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Browse Medicines
            </a>
          )}
        </div>
      )}
      
      {/* Update order status modal */}
      {showUpdateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Update Order Status</h3>
              <button
                onClick={() => setShowUpdateDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Current status:</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getStatusColor(selectedOrderId ? orders.find(o => o.id === selectedOrderId)?.status : '')
                }`}>
                  {selectedOrderId ? orders.find(o => o.id === selectedOrderId)?.status : ''}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select new status</option>
                  {getStatusOptions().map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Status progression: PENDING → CONFIRMED → PROCESSING → READY → SHIPPED → DELIVERED
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowUpdateDialog(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmStatusUpdate}
                disabled={!newStatus || updateLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {updateLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{updateLoading ? 'Updating...' : 'Update Status'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Payment Processing Modal */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Process Payment</h3>
              <button
                onClick={() => setShowPaymentDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={paymentDetails.payment_method}
                  onChange={(e) => setPaymentDetails({...paymentDetails, payment_method: e.target.value})}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">NPR</span>
                  </div>
                  <input
                    type="number"
                    value={paymentDetails.amount}
                    onChange={(e) => setPaymentDetails({...paymentDetails, amount: e.target.value})}
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction ID / Reference
                </label>
                <input
                  type="text"
                  value={paymentDetails.transaction_id}
                  onChange={(e) => setPaymentDetails({...paymentDetails, transaction_id: e.target.value})}
                  placeholder="Optional for cash payments"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={paymentDetails.notes}
                  onChange={(e) => setPaymentDetails({...paymentDetails, notes: e.target.value})}
                  rows={3}
                  placeholder="Any additional payment details"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowPaymentDialog(false)}
                disabled={updateLoading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={processPayment}
                disabled={updateLoading || !paymentDetails.amount}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {updateLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{updateLoading ? 'Processing...' : 'Complete Payment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;