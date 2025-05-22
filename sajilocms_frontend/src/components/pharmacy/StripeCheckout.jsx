// src/components/pharmacy/StripeCheckout.jsx
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  Box, Button, Typography, CircularProgress, Alert, Paper,
  TextField, Divider, Grid, Card, Chip, Tooltip, IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import LockIcon from '@mui/icons-material/Lock';
import PaymentIcon from '@mui/icons-material/Payment';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import apiClient from '../../utils/apiClient';

// Remember that API calls use '/pharmacy/' not '/api/pharmacy/'
const API_PATH = '/pharmacy/';

// Load Stripe outside of component to avoid recreating it on renders
let stripePromise;

// Stripe Checkout Form Component
const CheckoutForm = ({ clientSecret, amount, orderNumber, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [showTestCards, setShowTestCards] = useState(false);

  // Test card information
  const testCards = [
    { type: 'Visa', number: '4242 4242 4242 4242', expiry: '12/25', cvc: '123' },
    { type: 'Mastercard', number: '5555 5555 5555 4444', expiry: '12/25', cvc: '123' },
    { type: 'Visa (Declined)', number: '4000 0000 0000 0002', expiry: '12/25', cvc: '123' }
  ];

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      return;
    }

    if (!cardComplete) {
      setError('Please complete your card details');
      return;
    }

    if (!billingDetails.name) {
      setError('Please enter the name on your card');
      return;
    }

    if (!billingDetails.email) {
      setError('Please enter your email address');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: billingDetails,
        },
      });

      if (result.error) {
        setError(result.error.message);
        onError(result.error.message);
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          onSuccess(result.paymentIntent);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      onError('An unexpected error occurred. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card variant="outlined" sx={{ p: 3, mb: 3, borderColor: 'primary.light' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <LockIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Secure Payment</Typography>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Name on Card"
              value={billingDetails.name}
              onChange={(e) => setBillingDetails({ ...billingDetails, name: e.target.value })}
              required
              fullWidth
              margin="normal"
              error={!billingDetails.name && cardComplete}
              helperText={!billingDetails.name && cardComplete ? 'Name is required' : ''}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Email"
              type="email"
              value={billingDetails.email}
              onChange={(e) => setBillingDetails({ ...billingDetails, email: e.target.value })}
              required
              fullWidth
              margin="normal"
              error={!billingDetails.email && cardComplete}
              helperText={!billingDetails.email && cardComplete ? 'Email is required' : ''}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Phone Number"
              value={billingDetails.phone}
              onChange={(e) => setBillingDetails({ ...billingDetails, phone: e.target.value })}
              fullWidth
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Card Information</Typography>
              <Tooltip title="Click to show test card numbers you can use">
                <Button 
                  size="small" 
                  variant="text" 
                  onClick={() => setShowTestCards(!showTestCards)}
                  startIcon={<InfoIcon />}
                >
                  Test Cards
                </Button>
              </Tooltip>
            </Box>
            
            {showTestCards && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Test Card Numbers</Typography>
                <Typography variant="body2" gutterBottom>Use these cards for testing:</Typography>
                {testCards.map((card, index) => (
                  <Box key={index} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      <strong>{card.type}:</strong> {card.number} | Exp: {card.expiry} | CVC: {card.cvc}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
            
            <Box 
              sx={{ 
                border: cardComplete ? '1px solid #4caf50' : '1px solid #ccc', 
                borderRadius: 1, 
                p: 2, 
                '&:focus-within': { 
                  borderColor: 'primary.main',
                  boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)'
                },
                backgroundColor: 'white'
              }}
            >
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                      iconColor: '#666',
                    },
                    invalid: {
                      color: '#9e2146',
                      iconColor: '#fa755a'
                    },
                  },
                  hidePostalCode: true
                }}
                onChange={(e) => {
                  setCardComplete(e.complete);
                  if (e.error) setError(e.error.message);
                  else setError(null);
                }}
              />
            </Box>
            {cardComplete && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                <Chip 
                  label="Card Valid" 
                  color="success" 
                  size="small" 
                  variant="outlined" 
                  sx={{ mr: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Your card information is valid
                </Typography>
              </Box>
            )}
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1">Order Total:</Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                NPR {amount}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={!stripe || processing || !cardComplete}
              startIcon={processing ? <CircularProgress size={20} color="inherit" /> : <PaymentIcon />}
              size="large"
              sx={{ py: 1.5 }}
            >
              {processing ? 'Processing Payment...' : `Pay NPR ${amount}`}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              Your payment is secured with industry-standard encryption
            </Typography>
          </Grid>
        </Grid>
      </Card>
    </form>
  );
};

// Main Stripe Checkout Component
const StripeCheckout = ({ orderId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [paymentStep, setPaymentStep] = useState('initializing'); // initializing, ready, processing, success, error

  useEffect(() => {
    // Initialize Stripe
    const initializeStripe = async () => {
      setPaymentStep('initializing');
      try {
        // Create payment intent
        const response = await apiClient.post(`${API_PATH}create-payment-intent/`, {
          order_id: orderId
        });
        
        // Initialize Stripe if not already done
        if (!stripePromise) {
          stripePromise = loadStripe(response.data.publicKey);
        }
        
        setPaymentIntent(response.data);
        setPaymentStep('ready');
        setLoading(false);
      } catch (err) {
        console.error('Error initializing payment:', err);
        setError(err.response?.data?.error || 'Failed to initialize payment. Please try again.');
        setPaymentStep('error');
        setLoading(false);
      }
    };
    
    initializeStripe();
  }, [orderId]);

  const handlePaymentSuccess = async (paymentResult) => {
    console.log('Payment successful:', paymentResult);
    setPaymentStep('success');
    
    // Update payment status in the backend
    try {
      const response = await apiClient.post(`${API_PATH}update-payment-status/`, {
        payment_intent_id: paymentResult.id,
        order_id: orderId
      });
      
      console.log('Payment status updated:', response.data);
      
      // Short delay to show success message before redirecting
      setTimeout(() => {
        onSuccess(paymentResult);
      }, 1500);
    } catch (err) {
      console.error('Error updating payment status:', err);
      // Even if updating the status fails, we still consider the payment successful
      // as the webhook will eventually update the status
      setTimeout(() => {
        onSuccess(paymentResult);
      }, 1500);
    }
  };

  const handlePaymentError = (errorMessage) => {
    console.error('Payment error:', errorMessage);
    setError(errorMessage);
    setPaymentStep('error');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Initializing secure payment...
        </Typography>
      </Box>
    );
  }

  if (paymentStep === 'success') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="h6">Payment Successful!</Typography>
          <Typography>Your payment has been processed successfully.</Typography>
        </Alert>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Thank you for your purchase. Your order is now being processed.
        </Typography>
        <CircularProgress size={20} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Redirecting to order confirmation...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle1">Payment Error</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" onClick={onCancel}>
            Back to Cart
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              setError(null);
              setLoading(true);
              setPaymentStep('initializing');
              // Reinitialize payment after a short delay
              setTimeout(() => {
                const initializeStripe = async () => {
                  try {
                    const response = await apiClient.post(`${API_PATH}create-payment-intent/`, {
                      order_id: orderId
                    });
                    setPaymentIntent(response.data);
                    setPaymentStep('ready');
                    setLoading(false);
                  } catch (err) {
                    setError(err.response?.data?.error || 'Failed to initialize payment. Please try again.');
                    setPaymentStep('error');
                    setLoading(false);
                  }
                };
                initializeStripe();
              }, 1000);
            }}
          >
            Try Again
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          Complete Payment
        </Typography>
        <Chip 
          icon={<LockIcon />} 
          label="Secure Payment" 
          color="primary" 
          variant="outlined" 
          size="small" 
        />
      </Box>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Order <strong>#{paymentIntent.order_number}</strong> • Total: <strong>NPR {paymentIntent.amount}</strong>
      </Typography>
      
      {paymentIntent && stripePromise && (
        <Elements stripe={stripePromise}>
          <CheckoutForm 
            clientSecret={paymentIntent.clientSecret}
            amount={paymentIntent.amount}
            orderNumber={paymentIntent.order_number}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </Elements>
      )}
      
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button 
          variant="outlined" 
          color="inherit" 
          onClick={onCancel}
          sx={{ mt: 2 }}
          startIcon={<ArrowBackIcon />}
        >
          Cancel and return to cart
        </Button>
      </Box>
    </Box>
  );
};

export default StripeCheckout;
