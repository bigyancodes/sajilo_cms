import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getBillDetails, confirmStripePayment } from '../../api/billingService';
import { toast } from 'react-toastify';

const PaymentSuccess = () => {
  const [loading, setLoading] = useState(false);
  const [billId, setBillId] = useState(null);
  const location = useLocation();
  
  useEffect(() => {
    // Extract bill_id from URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const billIdParam = queryParams.get('bill_id');
    
    if (billIdParam) {
      setBillId(billIdParam);
      verifyPaymentStatus(billIdParam);
    }
  }, [location]);
  
  const verifyPaymentStatus = async (id) => {
    try {
      setLoading(true);
      // Fetch the bill details to verify it's marked as paid
      const response = await getBillDetails(id);
      
      if (response.data && response.data.status === 'PAID') {
        toast.success('Your payment has been successfully processed!');
      } else {
        console.log('Bill status:', response.data?.status);
        
        // If the bill is not marked as paid yet, use our direct endpoint to mark it as paid
        try {
          // Get session_id from URL if available
          const queryParams = new URLSearchParams(location.search);
          const sessionId = queryParams.get('session_id');
          
          console.log(`Confirming payment for bill ${id} with session ID: ${sessionId || 'N/A'}`);
          
          // Use the new direct endpoint to mark the bill as paid
          const confirmResponse = await confirmStripePayment(id, {
            session_id: sessionId || 'manual-confirmation',
            notes: `Manually confirmed via success page. Session ID: ${sessionId || 'N/A'}`
          });
          
          console.log('Payment confirmation response:', confirmResponse.data);
          
          if (confirmResponse.data && confirmResponse.data.status === 'PAID') {
            toast.success('Your payment has been successfully processed!');
            
            // Refresh the page after a short delay to show updated status
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            toast.info('Your payment is being processed. It may take a moment to be reflected in your account.');
          }
          
        } catch (confirmError) {
          console.error('Error confirming payment:', confirmError);
          console.error('Error details:', confirmError.response?.data || confirmError.message);
          
          if (confirmError.response?.status === 403) {
            toast.error('You do not have permission to confirm this payment.');
          } else {
            toast.info('Your payment is being processed. It may take a moment to be reflected in your account.');
          }
        }
      }
    } catch (error) {
      console.error('Error verifying payment status:', error);
      // Don't show an error to the user since the payment might still be processing
      toast.info('Your payment is being processed. Please check your bills in a few moments.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-block rounded-full bg-green-100 p-3 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for your payment. Your appointment has been confirmed.
            {loading && <span className="block mt-2 text-sm">Verifying payment status...</span>}
          </p>
          
          <div className="flex flex-col space-y-3">
            <Link 
              to="/patient/dashboard" 
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View My Bills
            </Link>
            <Link 
              to={`/patient/appointments?refresh=${Date.now()}`}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View My Appointments
            </Link>
            <Link 
              to="/" 
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
