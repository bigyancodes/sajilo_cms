import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Card,
  CardContent,
  CardActions,
  Paper
} from '@mui/material';
import { pharmacyService } from '../../api/pharmacyService';

const StripePayment = ({ orderData, onPaymentComplete, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  
  useEffect(() => {
    // Validate billing ID
    if (!orderData.billingId) {
      setError("Invalid billing ID. Cannot process payment.");
    }
  }, [orderData.billingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!cardholderName) {
      setError('Please enter cardholder name');
      return;
    }
    
    if (!cardNumber || !expiryDate || !cvc) {
      setError('Please fill in all card details');
      return;
    }
    
    // Basic validation
    if (cardNumber.replace(/\s/g, '').length < 15) {
      setError('Invalid card number');
      return;
    }
    
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      setError('Expiry date should be in MM/YY format');
      return;
    }
    
    if (cvc.length < 3) {
      setError('Invalid CVC');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Process payment using the backend API
      const response = await pharmacyService.processPayment(orderData.billingId);
      
      console.log('Payment process response:', response);
      
      if (response && response.url) {
        // If backend provides a redirect URL (e.g., to Stripe hosted checkout)
        setPaymentUrl(response.url);
        
        // Open the payment URL in a new tab
        window.open(response.url, '_blank');
        
        // Notify the parent component of payment initiation
        setPaymentSuccess(true);
        
        // Consider the payment successful when redirected
        // In a real app, you might want to handle webhooks or status checks
        setTimeout(() => {
          onPaymentComplete({
            success: true,
            paymentId: orderData.billingId,
            paymentMethod: 'stripe'
          });
        }, 2000);
      } else {
        throw new Error('No payment URL returned from server');
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {paymentSuccess ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Payment initiated successfully! Follow the instructions on the payment page that opened.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Cardholder Name"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Email (for receipt)"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              fullWidth
              margin="normal"
            />
          </Box>
          
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Card Information
              </Typography>
              <TextField
                label="Card Number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="1234 5678 9012 3456"
                fullWidth
                margin="normal"
                required
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Expiry Date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="MM/YY"
                  margin="normal"
                  required
                  sx={{ flexGrow: 1 }}
                />
                <TextField
                  label="CVC"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  placeholder="123"
                  margin="normal"
                  required
                  sx={{ flexGrow: 1 }}
                />
              </Box>
            </CardContent>
            <CardActions>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined" 
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : (
                    `Pay $${(orderData.amount).toFixed(2)}`
                  )}
                </Button>
              </Box>
            </CardActions>
          </Card>
          
          <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary">
              This will redirect you to our secure payment processor to complete your payment safely.
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
              Your card details are never stored on our servers.
            </Typography>
          </Paper>
        </form>
      )}
      
      {paymentUrl && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            If the payment page didn't open automatically, please 
            <Button 
              href={paymentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              size="small"
              sx={{ mx: 1 }}
            >
              click here
            </Button>
            to complete your payment.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default StripePayment; 