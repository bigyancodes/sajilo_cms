import React, { useState, useEffect } from 'react';
import { pharmacyService } from '../../api/pharmacyService';
import { 
  Alert, Box, Button, Card, CardContent, CircularProgress, Grid, Typography, TextField,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Stepper, Step, StepLabel, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel,
  Divider, List, ListItem, ListItemText
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PaymentIcon from '@mui/icons-material/Payment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptIcon from '@mui/icons-material/Receipt';
import StripePayment from '../../components/pharmacy/StripePayment';

// Mock data for medicines while backend is fixed
const MOCK_MEDICINES = [
  {
    id: 1,
    name: "Paracetamol",
    description: "Pain reliever and fever reducer",
    price: 5.99,
    stock_quantity: 100,
    manufacturer: "MedCorp",
    is_expired: false
  },
  {
    id: 2,
    name: "Amoxicillin",
    description: "Antibiotic used to treat bacterial infections",
    price: 12.50,
    stock_quantity: 50,
    manufacturer: "PharmaPlus",
    is_expired: false
  },
  {
    id: 3,
    name: "Ibuprofen",
    description: "Nonsteroidal anti-inflammatory drug (NSAID)",
    price: 7.25,
    stock_quantity: 75,
    manufacturer: "HealthPharm",
    is_expired: false
  },
  {
    id: 4,
    name: "Cetirizine",
    description: "Antihistamine for allergy relief",
    price: 8.99,
    stock_quantity: 60,
    manufacturer: "AllergyRelief",
    is_expired: false
  },
  {
    id: 5,
    name: "Omeprazole",
    description: "Reduces stomach acid production",
    price: 15.75,
    stock_quantity: 40,
    manufacturer: "GastroHealth",
    is_expired: false
  }
];

const OrderMedicinePage = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [useMockData, setUseMockData] = useState(false);
  
  // Checkout state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [billingId, setBillingId] = useState(null);

  const steps = ['Review Order', 'Delivery Details', 'Payment', 'Confirmation'];

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      try {
        // Get real data from the backend
        const response = await pharmacyService.getMedicines();
        
        console.log('Raw medicines response:', response);
        
        // Check if response is in the expected format
        let medicinesList = [];
        
        if (Array.isArray(response)) {
          medicinesList = response;
        } else if (response && Array.isArray(response.results)) {
          medicinesList = response.results;
        } else {
          console.error('Unexpected response format:', response);
          throw new Error('Invalid data format received from server');
        }
        
        // Then filter and sort the medicines
        const availableMedicines = medicinesList
          .filter(medicine => !medicine.is_expired && medicine.stock_quantity > 0)
          .sort((a, b) => a.name.localeCompare(b.name));
        
        console.log('Processed medicines:', availableMedicines);
        setMedicines(availableMedicines);
      } catch (err) {
        console.error('Error fetching medicines:', err);
        setError('Failed to load medicines. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleAddToCart = (medicine) => {
    setCart(prevCart => ({
      ...prevCart,
      [medicine.id]: (prevCart[medicine.id] || 0) + 1
    }));
  };

  const handleRemoveFromCart = (medicine) => {
    setCart(prevCart => {
      const newCart = { ...prevCart };
      if (newCart[medicine.id] > 1) {
        newCart[medicine.id] -= 1;
      } else {
        delete newCart[medicine.id];
      }
      return newCart;
    });
  };

  const handleCheckout = () => {
    setCheckoutOpen(true);
  };

  const handleCloseCheckout = () => {
    if (!orderSubmitting) {
      setCheckoutOpen(false);
      setActiveStep(0);
      if (orderSuccess) {
        setCart({});
        setOrderSuccess(false);
        setOrderId(null);
      }
    }
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleCloseCheckout();
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const calculateTotal = () => {
    return Object.entries(cart).reduce((total, [id, quantity]) => {
      const medicine = medicines.find(m => m.id.toString() === id.toString());
      return total + (medicine?.price || 0) * quantity;
    }, 0);
  };

  const handleSubmitOrder = async () => {
    if (paymentMethod === 'credit_card') {
      // For credit card payment, we create the order first, then proceed to payment
      setOrderSubmitting(true);
      setOrderError(null);
      
      try {
        // Structure the order data
        const orderItems = Object.entries(cart).map(([medicineId, quantity]) => {
          const medicine = medicines.find(m => m.id.toString() === medicineId.toString());
          return {
            medicine_id: medicineId,
            quantity: quantity,
            price: medicine?.price || 0
          };
        });

        const orderData = {
          delivery_address: deliveryAddress,
          payment_method: paymentMethod,
          items: orderItems,
          total_amount: calculateTotal()
        };

        console.log('Creating order for payment:', orderData);

        // Create the order first
        let createdOrderId;
        let createdBillingId;
        
        // Use the actual API to create the order
        const response = await pharmacyService.createOrder(orderData);
        console.log('Order creation response:', response);
        
        if (response && response.data) {
          createdOrderId = response.data.id;
          // Get the billing ID from the order response or create a billing record
          if (response.data.billing && response.data.billing.id) {
            createdBillingId = response.data.billing.id;
          } else {
            // If no billing is returned, we need to fetch or create one
            const billingResponse = await pharmacyService.getBillings({order_id: createdOrderId});
            console.log('Billing fetch response:', billingResponse);
            
            if (billingResponse && billingResponse.data && 
                billingResponse.data.results && 
                billingResponse.data.results.length > 0) {
              createdBillingId = billingResponse.data.results[0].id;
            } else {
              // Create a billing record if none exists
              const newBillingData = {
                order_id: createdOrderId,
                total_amount: calculateTotal(),
                payment_status: 'UNPAID'
              };
              const newBillingResponse = await pharmacyService.createBilling(newBillingData);
              console.log('New billing creation response:', newBillingResponse);
              if (newBillingResponse && newBillingResponse.data) {
                createdBillingId = newBillingResponse.data.id;
              }
            }
          }
        }
        
        // Store the created order and billing IDs
        if (createdOrderId) {
          setOrderId(createdOrderId);
        }
        
        if (createdBillingId) {
          setBillingId(createdBillingId);
        } else {
          throw new Error('Failed to create or retrieve billing record');
        }
        
        // Now proceed to the payment step
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
      } catch (err) {
        console.error('Error creating order for payment:', err);
        setOrderError('Failed to create order for payment. Please try again.');
      } finally {
        setOrderSubmitting(false);
      }
      return;
    }
    
    // Non-credit card payment (cash on delivery, etc.)
    setOrderSubmitting(true);
    setOrderError(null);
    
    try {
      // Structure the order data
      const orderItems = Object.entries(cart).map(([medicineId, quantity]) => {
        const medicine = medicines.find(m => m.id.toString() === medicineId.toString());
        return {
          medicine_id: medicineId,
          quantity: quantity,
          price: medicine?.price || 0
        };
      });

      const orderData = {
        delivery_address: deliveryAddress,
        payment_method: paymentMethod,
        items: orderItems,
        total_amount: calculateTotal()
      };

      console.log('Submitting order:', orderData);

      // Use the actual API to submit the order
      const response = await pharmacyService.createOrder(orderData);
      console.log('Order API response:', response);
      if (response && response.data) {
        setOrderId(response.data.id);
      } else {
        setOrderId(response.id || 'unknown');
      }
      setOrderSuccess(true);
      setActiveStep(steps.length - 1);
    } catch (err) {
      console.error('Error submitting order:', err);
      setOrderError('Failed to submit order. Please try again.');
    } finally {
      setOrderSubmitting(false);
    }
  };
  
  const handlePaymentComplete = (paymentResult) => {
    console.log('Payment completed:', paymentResult);
    
    // For Stripe payments, we'll be redirected back to the application
    // The payment status should be handled via webhook on the backend
    
    // In production mode, handle the redirect from Stripe
    // by checking URL parameters for payment status
    setOrderSuccess(true);
    setActiveStep(steps.length - 1);
    setOrderSubmitting(false);
    
    // Set flag to refresh orders list when user returns to it
    localStorage.setItem('refreshOrders', 'true');
  };

  const filteredMedicines = medicines.filter(medicine => 
    medicine.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = Object.values(cart).reduce((total, qty) => total + qty, 0);
  
  // Get cart items with details
  const cartItems = Object.entries(cart).map(([id, quantity]) => {
    const medicine = medicines.find(m => m.id.toString() === id.toString());
    return {
      id,
      name: medicine?.name || 'Unknown Medicine',
      price: medicine?.price || 0,
      quantity
    };
  });

  const renderCheckoutStep = () => {
    switch (activeStep) {
      case 0: // Review Order
        return (
          <Box>
            <DialogContentText>
              Please review your order before proceeding.
            </DialogContentText>
            <List>
              {cartItems.map(item => (
                <ListItem key={item.id}>
                  <ListItemText 
                    primary={item.name} 
                    secondary={`Quantity: ${item.quantity}`} 
                  />
                  <Typography variant="body1">
                    ${(item.price * item.quantity).toFixed(2)}
                  </Typography>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" justifyContent="space-between">
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6">${calculateTotal().toFixed(2)}</Typography>
            </Box>
          </Box>
        );
      
      case 1: // Delivery Details
        return (
          <Box>
            <DialogContentText>
              Please provide your delivery address.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="address"
              label="Delivery Address"
              type="text"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </Box>
        );
      
      case 2: // Payment
        return (
          <Box>
            <DialogContentText>
              Please select your preferred payment method.
            </DialogContentText>
            <FormControl component="fieldset" sx={{ mt: 2, mb: 3 }}>
              <FormLabel component="legend">Payment Method</FormLabel>
              <RadioGroup
                aria-label="payment-method"
                name="payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <FormControlLabel value="credit_card" control={<Radio />} label="Credit/Debit Card" />
                <FormControlLabel value="e_wallet" control={<Radio />} label="E-Wallet" />
                <FormControlLabel value="cash_on_delivery" control={<Radio />} label="Cash on Delivery" />
                <FormControlLabel value="insurance" control={<Radio />} label="Insurance Coverage" />
              </RadioGroup>
            </FormControl>
            
            {paymentMethod === 'credit_card' && (
              <StripePayment 
                orderData={{
                  orderId: orderId || 'new_order',
                  billingId: billingId,
                  amount: calculateTotal()
                }}
                onPaymentComplete={handlePaymentComplete}
                onCancel={() => setPaymentMethod('cash_on_delivery')}
              />
            )}
          </Box>
        );
      
      case 3: // Confirmation
        return (
          <Box sx={{ textAlign: 'center' }}>
            {orderSuccess ? (
              <>
                <Typography variant="h5" gutterBottom color="primary">
                  Order Placed Successfully!
                </Typography>
                <DialogContentText>
                  Your order has been received and is being processed. You will receive a confirmation email shortly.
                </DialogContentText>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body1">
                    Order Number: <strong>{orderId || `ORD-${Date.now().toString().slice(-8)}`}</strong>
                  </Typography>
                  <Typography variant="body1">
                    Estimated Delivery: <strong>{new Date(Date.now() + 86400000 * 3).toLocaleDateString()}</strong>
                  </Typography>
                </Box>
              </>
            ) : (
              <>
                <CircularProgress sx={{ mb: 2 }} />
                <DialogContentText>
                  Processing your order...
                </DialogContentText>
              </>
            )}
          </Box>
        );
          
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Order Medicines</Typography>
      
      {useMockData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Using sample data while backend is being fixed.
        </Alert>
      )}
      
      {error && !useMockData && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <TextField
          sx={{ flexGrow: 1, mr: 2 }}
          variant="outlined"
          label="Search medicines"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button 
          variant="outlined" 
          color={useMockData ? "warning" : "success"}
          onClick={() => {
            setUseMockData(!useMockData);
            setTimeout(fetchMedicines, 100);
          }}
        >
          {useMockData ? "Using Mock Data" : "Using Real Data"}
        </Button>
      </Box>
      
      {medicines.length === 0 && !loading && !error ? (
        <Alert severity="info">No medicines available at the moment.</Alert>
      ) : (
        <>
          <Grid container spacing={3}>
            {filteredMedicines.map(medicine => (
              <Grid item xs={12} sm={6} md={4} key={medicine.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{medicine.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {medicine.description || 'No description available'}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6">
                        ${medicine.price?.toFixed(2) || 'N/A'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {cart[medicine.id] ? (
                          <>
                            <Button 
                              variant="outlined" 
                              size="small"
                              onClick={() => handleRemoveFromCart(medicine)}
                            >
                              -
                            </Button>
                            <Typography sx={{ mx: 1 }}>{cart[medicine.id]}</Typography>
                            <Button 
                              variant="outlined" 
                              size="small"
                              onClick={() => handleAddToCart(medicine)}
                              disabled={cart[medicine.id] >= medicine.stock_quantity}
                            >
                              +
                            </Button>
                          </>
                        ) : (
                          <Button 
                            variant="contained" 
                            color="primary" 
                            startIcon={<ShoppingCartIcon />}
                            onClick={() => handleAddToCart(medicine)}
                          >
                            Add
                          </Button>
                        )}
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      In stock: {medicine.stock_quantity}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {totalItems > 0 && (
            <Box sx={{ mt: 4, textAlign: 'right' }}>
              <Button 
                variant="contained" 
                color="primary" 
                size="large"
                startIcon={<ShoppingCartIcon />}
                onClick={handleCheckout}
              >
                Checkout ({totalItems} items)
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Checkout Modal */}
      <Dialog 
        open={checkoutOpen} 
        onClose={handleCloseCheckout}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Checkout
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mt: 2, mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {orderError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {orderError}
            </Alert>
          )}

          {renderCheckoutStep()}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseCheckout} 
            disabled={orderSubmitting}
          >
            {orderSuccess ? 'Close' : 'Cancel'}
          </Button>
          
          {activeStep > 0 && activeStep < steps.length - 1 && activeStep !== 2 && (
            <Button 
              onClick={handleBack}
              disabled={orderSubmitting}
            >
              Back
            </Button>
          )}
          
          {activeStep === steps.length - 2 ? (
            paymentMethod !== 'credit_card' && (
              <Button 
                onClick={handleSubmitOrder}
                variant="contained" 
                color="primary"
                disabled={orderSubmitting || !deliveryAddress}
              >
                Place Order
              </Button>
            )
          ) : activeStep < steps.length - 1 ? (
            <Button 
              onClick={handleNext}
              variant="contained" 
              color="primary"
              disabled={orderSubmitting || (activeStep === 1 && !deliveryAddress)}
            >
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleCloseCheckout}
              variant="contained" 
              color="primary"
            >
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderMedicinePage;
