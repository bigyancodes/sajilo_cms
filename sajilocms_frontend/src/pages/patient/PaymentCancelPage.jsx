import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pharmacyService } from '../../api/pharmacyService';

const PaymentCancelPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const markPaymentCancelled = async () => {
      try {
        // Get billing_id from query parameters
        const params = new URLSearchParams(location.search);
        const billingId = params.get('billing_id');
        
        if (!billingId) {
          setError('Missing billing ID. Cannot process payment cancellation.');
          return;
        }
        
        console.log('Processing payment cancellation for billing ID:', billingId);
        
        const response = await pharmacyService.markPaymentCancelled(billingId);
        console.log('Payment cancelled response:', response);
        
        setCancelled(true);
        
        // Automatically redirect to orders page after 3 seconds
        setTimeout(() => {
          navigate('/patient/my-orders');
        }, 3000);
      } catch (err) {
        console.error('Error marking payment as cancelled:', err);
        setError('Failed to process payment cancellation. Please contact support.');
      }
    };

    markPaymentCancelled();
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
      ) : cancelled ? (
        <div>
          <h2>Payment Cancelled</h2>
          <p>Your payment was cancelled. No charges have been made.</p>
          <p>Redirecting to your orders page...</p>
        </div>
      ) : (
        <div>
          <h2>Processing Cancellation</h2>
          <p>Please wait while we confirm your payment cancellation...</p>
        </div>
      )}
    </div>
  );
};

export default PaymentCancelPage;

