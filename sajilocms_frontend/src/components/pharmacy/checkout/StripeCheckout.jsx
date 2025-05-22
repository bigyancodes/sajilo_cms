import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { pharmacyService } from '../../../api/pharmacyService';
import { AuthContext } from '../../../context/AuthContext';
import { Alert, Box, Button, CircularProgress, Container, Paper, Typography } from '@mui/material';

// Load Stripe outside of component to avoid recreating it on each render
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

// Actual checkout form component
const CheckoutForm = ({ amount, onSuccess, orderData }) => {
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntent, setPaymentIntent] = useState(null);
  
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { prepareStripeRedirect } = useContext(AuthContext);
  
  // Create payment intent when component mounts
  useEffect(() => {
    const createIntent = async () => {
      try {
        setProcessing(true);
        const { client_secret, payment_intent_id } = await pharmacyService.createPaymentIntent({
          amount: amount * 100, // Convert to cents for Stripe
          currency: 'usd',
          metadata: {
            order_type: 'pharmacy'
          }
        });
        
        setClientSecret(client_secret);
        setPaymentIntent(payment_intent_id);
        setProcessing(false);
      } catch (err) {
        console.error('Error creating payment intent:', err);
        setError('Failed to initialize payment. Please try again later.');
        setProcessing(false);
      }
    };
    
    if (amount > 0) {
      createIntent();
    }
  }, [amount]);
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setProcessing(true);
    
    try {
      // Store order data in localStorage for retrieval after redirect
      localStorage.setItem('pending_order', JSON.stringify({
        ...orderData,
        payment_method: 'card',
        payment_intent_id: paymentIntent,
        total_amount: amount,
        created_at: new Date().toISOString()
      }));
      
      console.log('Stored pending order in localStorage:', orderData);
      
      // Prepare for Stripe redirect - this will save necessary data to localStorage
      prepareStripeRedirect();
      
      // Add stripe_redirect=true to the return URL
      const returnUrl = `${window.location.origin}/pharmacy/checkout/complete?stripe_redirect=true`;
      
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
        return_url: returnUrl,
      });
      
      if (result.error) {
        setError(`Payment failed: ${result.error.message}`);
        setProcessing(false);
      } else if (result.paymentIntent.status === 'succeeded') {
        // Handle successful payment without redirect
        setSucceeded(true);
        setProcessing(false);
        
        // Create the order with the payment information
        const orderResult = await pharmacyService.createPatientOrder({
          ...orderData,
          payment_method: 'card',
          payment_intent_id: paymentIntent,
          total_amount: amount
        });
        
        onSuccess(orderResult);
      } else if (result.paymentIntent.status === 'requires_action') {
        // The payment requires additional authentication steps
        // The page will be redirected, so we don't need to do anything here
        console.log('Payment requires additional action, redirecting...');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('An unexpected error occurred. Please try again.');
      setProcessing(false);
    }
  };
  
  const cardElementOptions = {
    style: {
      base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Card Details
        </Typography>
        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <CardElement options={cardElementOptions} />
        </Box>
      </Box>
      
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={processing || !stripe || succeeded}
      >
        {processing ? (
          <>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            Processing...
          </>
        ) : (
          `Pay $${amount.toFixed(2)}`
        )}
      </Button>
    </form>
  );
};

// Wrapper component that provides the Stripe context
const StripeCheckout = ({ amount, onSuccess, orderData }) => {
  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" gutterBottom align="center">
          Secure Payment
        </Typography>
        
        <Elements stripe={stripePromise}>
          <CheckoutForm amount={amount} onSuccess={onSuccess} orderData={orderData} />
        </Elements>
      </Paper>
    </Container>
  );
};

export default StripeCheckout; 