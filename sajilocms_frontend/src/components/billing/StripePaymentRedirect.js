import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBillDetails, createStripeCheckout } from '../../api/billingService';

const StripePaymentRedirect = () => {
  const { billId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const loadBillAndRedirect = async () => {
      if (!billId) {
        setError('Invalid bill ID');
        setLoading(false);
        return;
      }
      
      try {
        // Get bill details
        const billResponse = await getBillDetails(billId);
        
        // Verify bill is pending payment
        if (billResponse.data.status !== 'PENDING') {
          setError('This bill is not pending payment.');
          setLoading(false);
          return;
        }
        
        // Create Stripe checkout session
        const stripeResponse = await createStripeCheckout({
          bill_id: billId,
          success_url: `${window.location.origin}/payment-success`,
          cancel_url: `${window.location.origin}/payment-cancel`
        });
        
        // Redirect to Stripe
        window.location.href = stripeResponse.data.checkout_url;
      } catch (err) {
        console.error('Failed to process payment:', err);
        setError(err.response?.data?.error || 'Failed to initialize payment. Please try again.');
        setLoading(false);
      }
    };
    
    loadBillAndRedirect();
  }, [billId, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Initializing Payment</h2>
          <p className="text-gray-600">Please wait, redirecting to payment gateway...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-block rounded-full bg-red-100 p-3 mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Payment Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => navigate('/patient/appointments')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                View Appointments
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export default StripePaymentRedirect;
