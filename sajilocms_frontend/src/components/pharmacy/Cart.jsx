// src/components/pharmacy/Cart.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/apiClient';
import StripeCheckout from './StripeCheckout';

const Cart = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState({
    delivery_type: 'PICKUP',
    delivery_address: '',
    delivery_phone: '',
    delivery_notes: ''
  });
  const [orderLoading, setOrderLoading] = useState(false);
  
  // Stripe payment states
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH or CARD
  
  // Fetch cart data
  const fetchCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/pharmacy/cart/');
      setCart(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load cart', err);
      if (!navigator.onLine) {
        setError('Network error. Please check your internet connection and try again.');
      } else if (err.response) {
        setError(err.response.data?.detail || 'Failed to load cart');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
      setLoading(false);
    }
  };
  
  // Load cart data on component mount
  useEffect(() => {
    fetchCart();
  }, []);
  
  // Handle quantity change
  const handleQuantityChange = async (itemId, action) => {
    try {
      if (action === 'increase') {
        await apiClient.post(`/pharmacy/cart/add/${itemId}/`);
      } else if (action === 'decrease') {
        await apiClient.post(`/pharmacy/cart/decrease/${itemId}/`);
      }
      fetchCart();
    } catch (err) {
      console.error('Failed to update quantity', err);
      setError(err.response?.data?.detail || 'Failed to update quantity');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Handle item removal
  const handleRemoveItem = async (itemId) => {
    try {
      await apiClient.delete(`/pharmacy/cart/remove/${itemId}/`);
      fetchCart();
      setSuccess('Item removed from cart');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to remove item', err);
      setError(err.response?.data?.detail || 'Failed to remove item');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Handle cart clearing
  const handleClearCart = async () => {
    try {
      await apiClient.delete('/pharmacy/cart/clear/');
      fetchCart();
      setSuccess('Cart cleared successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to clear cart', err);
      setError(err.response?.data?.detail || 'Failed to clear cart');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Handle checkout
  const handleCheckout = async () => {
    setOrderLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post('/pharmacy/orders/create/', orderDetails, {
        timeout: 10000
      });
      
      console.log('Order created successfully:', response.data);
      setCreatedOrder(response.data);
      
      if (paymentMethod === 'CARD') {
        setShowStripeCheckout(true);
        setCheckoutOpen(false);
      } else {
        setSuccess('Order placed successfully! You can pay at pickup/delivery.');
        setCheckoutOpen(false);
        fetchCart();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to place order', err);
      
      let errorMessage = 'Failed to place order';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.response) {
        console.log('Error response:', err.response);
        
        if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        } else if (err.response.status === 400) {
          if (err.response.data?.detail) {
            errorMessage = err.response.data.detail;
          } else if (err.response.data?.error) {
            errorMessage = err.response.data.error;
          } else if (err.response.data?.non_field_errors) {
            errorMessage = err.response.data.non_field_errors.join(', ');
          } else if (typeof err.response.data === 'string') {
            errorMessage = err.response.data;
          } else if (Object.keys(err.response.data || {}).length > 0) {
            const fieldErrors = [];
            for (const [field, errors] of Object.entries(err.response.data)) {
              if (Array.isArray(errors)) {
                fieldErrors.push(`${field}: ${errors.join(', ')}`);
              } else {
                fieldErrors.push(`${field}: ${errors}`);
              }
            }
            if (fieldErrors.length > 0) {
              errorMessage = fieldErrors.join('; ');
            }
          }
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (err.response.status === 404) {
          errorMessage = 'The requested resource was not found.';
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setOrderLoading(false);
    }
  };
  
  // Handle successful Stripe payment
  const handlePaymentSuccess = (paymentResult) => {
    console.log('Payment successful:', paymentResult);
    setShowStripeCheckout(false);
    setSuccess('Payment successful! Your order has been placed.');
    fetchCart();
    setTimeout(() => setSuccess(null), 3000);
  };
  
  // Handle Stripe payment cancellation
  const handlePaymentCancel = () => {
    setShowStripeCheckout(false);
    setSuccess('Your order has been placed, but payment is still pending. You can pay at pickup/delivery.');
    fetchCart();
    setTimeout(() => setSuccess(null), 3000);
  };
  
  // Handle input change for checkout form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrderDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!cart || cart.items?.length === 0) {
    return (
      <div>
        <div className="flex items-center mb-6">
          <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800">Shopping Cart</h2>
        </div>
        
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
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
          <p className="text-gray-600">Add items to your cart to see them here.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center mb-6">
        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-800">Shopping Cart</h2>
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
      
      {/* Stripe Checkout */}
      {showStripeCheckout && createdOrder && (
        <div className="mb-6">
          <StripeCheckout 
            orderId={createdOrder.id} 
            onSuccess={handlePaymentSuccess} 
            onCancel={handlePaymentCancel} 
          />
        </div>
      )}
      
      {/* Cart content */}
      {!showStripeCheckout && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Cart Items</h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {cart.items.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-base font-medium text-gray-900">{item.medicine.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          NPR {item.medicine.unit_price} per {item.medicine.unit}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.medicine.description}
                        </p>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-3 mx-4">
                        <button
                          onClick={() => handleQuantityChange(item.id, 'decrease')}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="text-base font-medium text-gray-900 min-w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.id, 'increase')}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Price and Remove */}
                      <div className="flex items-center space-x-3">
                        <span className="text-base font-semibold text-gray-900 min-w-20 text-right">
                          NPR {item.total_price}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="w-8 h-8 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={handleClearCart}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({cart.total_items} items)</span>
                  <span className="text-gray-900">NPR {cart.total_amount}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (13%)</span>
                  <span className="text-gray-900">NPR {(cart.total_amount * 0.13).toFixed(2)}</span>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-semibold text-gray-900">
                      NPR {(cart.total_amount * 1.13).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setCheckoutOpen(true)}
                className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Proceed to Checkout</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Checkout</h3>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Delivery Options */}
              <div>
                <h4 className="text-base font-medium text-gray-900 mb-3">Delivery Options</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Type
                    </label>
                    <select
                      name="delivery_type"
                      value={orderDetails.delivery_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="PICKUP">Pickup from Pharmacy</option>
                      <option value="DELIVERY">Home Delivery</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-base font-medium text-gray-900 mb-3">Payment Method</h4>
                
                <div>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="CASH">Cash on Delivery/Pickup</option>
                    <option value="CARD">Pay with Card (Stripe)</option>
                  </select>
                </div>
              </div>
              
              {orderDetails.delivery_type === 'DELIVERY' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Address *
                    </label>
                    <input
                      type="text"
                      name="delivery_address"
                      value={orderDetails.delivery_address}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      name="delivery_phone"
                      value={orderDetails.delivery_phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  name="delivery_notes"
                  value={orderDetails.delivery_notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any special instructions..."
                />
              </div>
              
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-base font-medium text-gray-900 mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{cart.total_items}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>NPR {cart.total_amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (13%):</span>
                    <span>NPR {(cart.total_amount * 0.13).toFixed(2)}</span>
                  </div>
                  {orderDetails.delivery_type === 'DELIVERY' && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>NPR 100.00</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2 mt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>
                        NPR {
                          (orderDetails.delivery_type === 'DELIVERY' 
                            ? cart.total_amount * 1.13 + 100 
                            : cart.total_amount * 1.13
                          ).toFixed(2)
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setCheckoutOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCheckout}
                disabled={orderLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {orderLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{orderLoading ? 'Processing...' : 'Place Order'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;