import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pharmacyService } from '../../api/pharmacyService';

const PaymentSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const markPaymentSuccess = async () => {
      try {
        // Get billing_id from query parameters
        const params = new URLSearchParams(location.search);
        const billingId = params.get('billing_id');
        
        if (!billingId) {
          setError('Missing billing ID. Cannot process payment.');
          return;
        }
        
        console.log('Processing payment success for billing ID:', billingId);
        
        const response = await pharmacyService.markPaymentSuccess(billingId);
        console.log('Payment success response:', response);
        
        // Set a flag in localStorage to indicate we need to refresh orders
        localStorage.setItem('refreshOrders', 'true');
        localStorage.setItem('lastPaidBillingId', billingId);
        
        setSuccess(true);
        
        // Automatically redirect to orders page after 2 seconds
        setTimeout(() => {
          navigate('/patient/my-orders');
        }, 2000);
      } catch (err) {
        console.error('Error marking payment as successful:', err);
        setError('Failed to process payment confirmation. Please contact support.');
      }
    };

    markPaymentSuccess();
  }, [location.search, navigate]);

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '600px', 
      margin: '0 auto', 
      textAlign: 'center',
      marginTop: '2rem'
    }}>
      {error ? (
        <div style={{ color: 'red', fontWeight: 'bold' }}>
          {error}
        </div>
      ) : success ? (
        <div>
          <h2>Payment Successful!</h2>
          <p>Your order has been confirmed and is being processed.</p>
          <p>Redirecting to your orders page...</p>
        </div>
      ) : (
        <div>
          <h2>Processing Payment</h2>
          <p>Please wait while we confirm your payment...</p>
        </div>
      )}
    </div>
  );
};

export default PaymentSuccessPage;

