import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Paper, Button, CircularProgress } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { pharmacyService } from '../../../api/pharmacyService';
import { AuthContext } from '../../../context/AuthContext';

const CheckoutComplete = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useContext(AuthContext);
  
  useEffect(() => {
    const processPayment = async () => {
      try {
        setLoading(true);
        
        // Parse URL parameters
        const params = new URLSearchParams(location.search);
        const paymentIntentId = params.get('payment_intent');
        const paymentIntentClientSecret = params.get('payment_intent_client_secret');
        const redirectStatus = params.get('redirect_status');
        
        // Check if this is a Stripe redirect
        const isStripeRedirect = params.get('stripe_redirect') === 'true';
        
        console.log('CheckoutComplete: Detected parameters', { 
          paymentIntentId, 
          isStripeRedirect,
          redirectStatus
        });
        
        if (!isStripeRedirect || !paymentIntentId) {
          throw new Error('Invalid payment information');
        }
        
        // Refresh user session first to ensure we're authenticated
        console.log('CheckoutComplete: Refreshing user session...');
        await refreshUser(true);
        
        // Confirm the payment on our backend
        if (redirectStatus === 'succeeded' || !redirectStatus) {
          console.log('CheckoutComplete: Confirming payment with backend...');
          
          // Get pending order from localStorage if available
          const pendingOrder = localStorage.getItem('pending_order');
          const requestData = {
            payment_intent_id: paymentIntentId
          };
          
          if (pendingOrder) {
            try {
              requestData.pending_order = JSON.parse(pendingOrder);
              console.log('CheckoutComplete: Using pending order from localStorage:', requestData.pending_order);
            } catch (e) {
              console.error('CheckoutComplete: Error parsing pending order:', e);
            }
          }
          
          const result = await pharmacyService.confirmPayment(requestData);
          console.log('CheckoutComplete: Payment confirmation successful', result);
          setOrderDetails(result);
          
          // Clean up localStorage
          localStorage.removeItem('pending_order');
          localStorage.removeItem('stripeRedirectPending');
          localStorage.removeItem('stripeRedirectTime');
          localStorage.removeItem('stripeUserData');
        } else {
          throw new Error(`Payment ${redirectStatus}`);
        }
      } catch (err) {
        console.error('Error processing payment:', err);
        setError(err.message || 'Failed to process payment');
      } finally {
        setLoading(false);
      }
    };
    
    processPayment();
  }, [location.search, refreshUser]);
  
  const handleContinueShopping = () => {
    navigate('/pharmacy/medicines');
  };
  
  const handleViewOrder = () => {
    if (orderDetails && orderDetails.id) {
      navigate(`/pharmacy/orders/${orderDetails.id}`);
    } else {
      navigate('/pharmacy/orders');
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="md">
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '60vh' 
          }}
        >
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Processing your payment...
          </Typography>
          <Typography color="textSecondary" sx={{ mt: 1 }}>
            Please do not close this page.
          </Typography>
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              textAlign: 'center' 
            }}
          >
            <ErrorOutlineIcon color="error" sx={{ fontSize: 60 }} />
            <Typography variant="h5" sx={{ mt: 2 }}>
              Payment Failed
            </Typography>
            <Typography color="textSecondary" sx={{ mt: 1, mb: 3 }}>
              {error}
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleContinueShopping}
            >
              Return to Shop
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            textAlign: 'center' 
          }}
        >
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60 }} />
          <Typography variant="h5" sx={{ mt: 2 }}>
            Payment Successful!
          </Typography>
          <Typography sx={{ mt: 1 }}>
            Your order has been placed successfully.
          </Typography>
          
          {orderDetails && (
            <Box sx={{ mt: 3, width: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                borderBottom: '1px solid #eee',
                py: 1
              }}>
                <Typography>Order Number:</Typography>
                <Typography fontWeight="bold">{orderDetails.order_number || orderDetails.id}</Typography>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                borderBottom: '1px solid #eee',
                py: 1
              }}>
                <Typography>Total Amount:</Typography>
                <Typography fontWeight="bold">${orderDetails.total_amount?.toFixed(2) || '0.00'}</Typography>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                py: 1
              }}>
                <Typography>Status:</Typography>
                <Typography fontWeight="bold" color="success.main">Paid</Typography>
              </Box>
            </Box>
          )}
          
          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined"
              onClick={handleContinueShopping}
            >
              Continue Shopping
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleViewOrder}
            >
              View Order
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default CheckoutComplete; 