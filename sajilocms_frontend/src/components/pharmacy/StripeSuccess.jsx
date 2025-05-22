import React, { useEffect, useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Button, 
  Alert,
  Divider
} from '@mui/material';
import { CheckCircleOutline as CheckCircleIcon } from '@mui/icons-material';
import pharmacyService from '../../api/pharmacyService';
import { AuthContext } from '../../context/AuthContext';
import { silentTokenRefresh, handleStripeReturn } from '../../api/axiosInstance';

const StripeSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const { refreshUser, user } = useContext(AuthContext);

  // Handle authentication restoration
  useEffect(() => {
    let isMounted = true;
    let authRetries = 0;
    const maxRetries = 3;

    const restoreAuth = async () => {
      if (!isMounted) return;
      try {
        setAuthLoading(true);
        console.log('[StripeSuccess] Attempting to restore authentication...');
        
        // First try handleStripeReturn which is specifically designed for this
        console.log('[StripeSuccess] Calling handleStripeReturn...');
        const stripeResult = await handleStripeReturn();
        console.log('[StripeSuccess] handleStripeReturn result:', stripeResult);
        
        // Then try silentTokenRefresh as a backup
        if (!stripeResult.success) {
          console.log('[StripeSuccess] Attempting silentTokenRefresh...');
          const result = await silentTokenRefresh();
          console.log('[StripeSuccess] silentTokenRefresh result:', result);
        }
        
        // Finally refresh the user context
        console.log('[StripeSuccess] Refreshing user context...');
        await refreshUser();
        
        if (isMounted) {
          setAuthLoading(false);
          console.log('[StripeSuccess] Auth restoration complete. User:', user);
        }
      } catch (err) {
        console.error('[StripeSuccess] Error in auth restoration:', err);
        
        // Retry auth restoration if we haven't exceeded max retries
        if (authRetries < maxRetries && isMounted) {
          authRetries++;
          console.log(`[StripeSuccess] Retrying auth restoration (${authRetries}/${maxRetries})...`);
          setTimeout(restoreAuth, 1000); // Wait 1 second before retrying
          return;
        }
        
        if (isMounted) {
          setAuthLoading(false);
          
          // Even if auth restoration fails, try to use stored user data
          const storedUserData = localStorage.getItem('userData') || localStorage.getItem('stripeUserData');
          if (storedUserData) {
            console.log('[StripeSuccess] Using stored user data as fallback');
            // We'll continue with the payment confirmation using stored data
          } else {
            console.error('[StripeSuccess] No stored user data available');
          }
        }
      }
    };

    restoreAuth();

    return () => {
      isMounted = false;
    };
  }, [refreshUser, user]);

  // Confirm payment after auth is restored or after max retries
  useEffect(() => {
    let isMounted = true;

    const confirmPayment = async () => {
      if (authLoading) return;
      try {
        if (!isMounted) return;
        setLoading(true);
        
        const sessionId = searchParams.get('session_id');
        const paymentIntentId = searchParams.get('payment_intent');
        const isStripeRedirect = searchParams.get('stripe_redirect') === 'true';
        
        console.log('[StripeSuccess] sessionId:', sessionId, 'paymentIntentId:', paymentIntentId, 'isStripeRedirect:', isStripeRedirect);
        
        if (!sessionId && !paymentIntentId) {
          throw new Error('No payment session identified');
        }
        
        // Verify we have a valid user session before proceeding
        if (!user || !user.id) {
          console.log('[StripeSuccess] No valid user found, attempting to restore from localStorage');
          const storedUserData = localStorage.getItem('userData') || localStorage.getItem('stripeUserData');
          if (!storedUserData) {
            throw new Error('Authentication failed. Please log in again.');
          }
        }
        
        // Get pending order from localStorage
        const pendingOrder = localStorage.getItem('pending_order');
        const requestData = {
          payment_intent_id: paymentIntentId || sessionId
        };
        
        if (pendingOrder) {
          try {
            requestData.pending_order = JSON.parse(pendingOrder);
            console.log('[StripeSuccess] Using pending order from localStorage:', requestData.pending_order);
          } catch (e) {
            console.error('[StripeSuccess] Error parsing pending order:', e);
          }
        }
        
        console.log('[StripeSuccess] Sending confirmPayment request:', requestData);
        const response = await pharmacyService.confirmPayment(requestData);
        console.log('[StripeSuccess] confirmPayment response:', response);
        
        if (isMounted) {
          setOrderDetails(response.order);
          
          // Clean up localStorage
          localStorage.removeItem('pending_order');
          localStorage.removeItem('stripeRedirectPending');
          localStorage.removeItem('stripeRedirectTime');
          
          // Don't remove stripeUserData yet - keep it as a fallback
          
          setLoading(false);
          console.log('[StripeSuccess] Payment confirmed and state updated.');
        }
      } catch (err) {
        console.error('[StripeSuccess] Payment confirmation error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to confirm payment');
          setLoading(false);
        }
      }
    };

    confirmPayment();

    return () => {
      isMounted = false;
    };
  }, [searchParams, authLoading, user]);

  const handleBackToPharmacy = () => {
    // Clean up any remaining Stripe data
    localStorage.removeItem('stripeUserData');
    localStorage.removeItem('stripeRedirectPending');
    localStorage.removeItem('stripeRedirectTime');
    localStorage.removeItem('pending_order');
    
    // Navigate back to pharmacy order history tab
    navigate('/patient/pharmacy', { state: { activeTab: 1 } });
  };

  if (authLoading || loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '50vh',
          p: 3
        }}
      >
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6">
          {authLoading ? 'Restoring your session...' : 'Confirming your payment...'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we process your order
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Typography paragraph>
          There was a problem confirming your payment. If your card was charged, please contact customer support.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleBackToPharmacy}
        >
          Return to Pharmacy
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <CheckCircleIcon 
            sx={{ 
              fontSize: 100, 
              color: 'success.main',
              mb: 2
            }} 
          />
          <Typography variant="h4" gutterBottom>
            Payment Successful!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your order has been placed successfully.
          </Typography>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        {orderDetails && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Details
            </Typography>
            <Typography variant="body1">
              Order ID: #{orderDetails.id}
            </Typography>
            <Typography variant="body1">
              Total Amount: ${orderDetails.total_amount}
            </Typography>
            <Typography variant="body1">
              Status: {orderDetails.status}
            </Typography>
          </Box>
        )}
        
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth
          onClick={handleBackToPharmacy}
        >
          Return to Pharmacy
        </Button>
      </Paper>
    </Box>
  );
};

export default StripeSuccess;