import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Typography,
  Button,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Chip,
  Badge,
  Drawer,
  Paper,
  Tooltip,
} from '@mui/material';
import { 
  Search as SearchIcon, 
  ShoppingCart as CartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  DeleteOutline as DeleteIcon,
  LocalPharmacy as MedicineIcon
} from '@mui/icons-material';
import MedicineDetail from './MedicineDetail';
import { formatCurrency, calculateTotal, truncateText } from '../../utils/dateUtils';
import pharmacyService from '../../api/pharmacyService';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe outside the component
const stripePromise = loadStripe('pk_test_51RKOKMApkROYyJNpDpzeMnrOoDis7f8TCV7XrF0TLt9pggLT5R0JKKOWDjfdwN2ZeTvjOrCQy7ED8S2K6FRHOCtC00K5k3Xm44');

const MedicineList = () => {
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchMedicines();
  }, []);

  // Memoize filterMedicines function to prevent unnecessary re-renders
  const filterMedicines = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredMedicines(medicines);
      return;
    }
    
    const filtered = medicines.filter(medicine => 
      medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicine.generic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicine.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMedicines(filtered);
  }, [searchTerm, medicines]);

  useEffect(() => {
    if (medicines.length) {
      filterMedicines();
    }
  }, [medicines, filterMedicines]);

  const fetchMedicines = async () => {
    try {
      const data = await pharmacyService.getMedicines();
      setMedicines(data.results || data);
      setFilteredMedicines(data.results || data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch medicines');
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAddToCart = (medicine, quantity = 1) => {
    setCart(prev => ({
      ...prev,
      [medicine.id]: {
        ...medicine,
        quantity: (prev[medicine.id]?.quantity || 0) + quantity
      }
    }));
    setSnackbar({
      open: true,
      message: `${medicine.name} added to cart`,
      severity: 'success'
    });
  };

  const handleRemoveFromCart = (medicineId) => {
    setCart(prev => {
      const updated = { ...prev };
      delete updated[medicineId];
      return updated;
    });
  };

  const handleUpdateCartQuantity = (medicineId, quantity) => {
    if (quantity < 1) return;
    
    setCart(prev => ({
      ...prev,
      [medicineId]: {
        ...prev[medicineId],
        quantity: parseInt(quantity)
      }
    }));
  };

  const handleCreateOrder = async () => {
    if (Object.keys(cart).length === 0) {
      setSnackbar({
        open: true,
        message: 'Your cart is empty',
        severity: 'warning'
      });
      return;
    }

    if (!deliveryAddress.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a delivery address',
        severity: 'warning'
      });
      return;
    }
    
    try {
      setLoading(true);
      const orderItems = Object.keys(cart).map(id => ({
        medicine_id: id,
        quantity: cart[id].quantity,
        unit_price: cart[id].price
      }));

      const totalAmount = calculateTotal(cart);
      
      const orderData = {
        items: orderItems,
        delivery_address: deliveryAddress,
        payment_method: paymentMethod,
        total_amount: totalAmount
      };

      if (paymentMethod === 'ONLINE') {
        setProcessingPayment(true);
        
        try {
          // Store authentication session for post-redirect restoration
          localStorage.setItem('stripeRedirectPending', 'true');
          
          // Get current timestamp for authentication check
          const timestamp = new Date().getTime();
          localStorage.setItem('stripeRedirectTime', timestamp.toString());
          
          // Create a payment intent on the server
          const paymentResponse = await pharmacyService.createPaymentIntent({
            amount: Math.round(totalAmount * 100), // Convert to cents for Stripe
            currency: 'usd',
            description: 'Medicine order payment',
            items: orderItems, // Pass the items for the backend to use
            delivery_address: deliveryAddress // Pass the delivery address
          });
          
          // Load Stripe.js 
          const stripe = await stripePromise;
          
          if (paymentResponse.url) {
            // Redirect to Stripe's hosted checkout page
            window.location.href = paymentResponse.url;
            return;
          } else if (paymentResponse.sessionId) {
            // Use redirectToCheckout method
            const { error } = await stripe.redirectToCheckout({
              sessionId: paymentResponse.sessionId
            });
            
            if (error) {
              throw new Error(error.message);
            }
          } else {
            throw new Error('No session information returned from payment service');
          }
        } catch (error) {
          // Clean up flag in case of error
          localStorage.removeItem('stripeRedirectPending');
          localStorage.removeItem('stripeRedirectTime');
          
          setProcessingPayment(false);
          setSnackbar({
            open: true,
            message: `Payment error: ${error.message}`,
            severity: 'error'
          });
        }
        
        // The rest of this code won't execute until after checkout completes
        return;
      }
      
      // For Cash on Delivery, continue with normal order creation
      await pharmacyService.createPatientOrder(orderData);
      
      setCart({});
      setCartOpen(false);
      setSnackbar({
        open: true,
        message: 'Order created successfully!',
        severity: 'success'
      });
      setDeliveryAddress("");
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to create order',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setProcessingPayment(false);
    }
  };

  const openMedicineDetail = (medicine) => {
    setSelectedMedicine(medicine);
    setDetailOpen(true);
  };

  const closeMedicineDetail = () => {
    setDetailOpen(false);
  };

  const cartItemsCount = Object.values(cart).reduce((total, item) => total + item.quantity, 0);

  // Cart drawer content
  const cartContent = (
    <Box sx={{ width: 400, p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" component="div" gutterBottom>
        Your Cart
      </Typography>
      
      {Object.keys(cart).length === 0 ? (
        <Typography variant="body1" sx={{ my: 4, textAlign: 'center' }}>
          Your cart is empty
        </Typography>
      ) : (
        <>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {Object.values(cart).map((item) => (
              <Paper key={item.id} sx={{ mb: 2, p: 2 }}>
                <Typography variant="subtitle1" component="div">
                  {item.name}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton size="small" onClick={() => handleUpdateCartQuantity(item.id, item.quantity - 1)}>
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                    <IconButton size="small" onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body2">
                    {formatCurrency(item.price * item.quantity)}
                  </Typography>
                  <IconButton size="small" color="error" onClick={() => handleRemoveFromCart(item.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Box>
          
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Delivery Information
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Delivery Address"
              variant="outlined"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Payment Method
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Chip
                label="Cash on Delivery"
                variant={paymentMethod === 'CASH_ON_DELIVERY' ? 'filled' : 'outlined'}
                color={paymentMethod === 'CASH_ON_DELIVERY' ? 'primary' : 'default'}
                onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
                sx={{ flex: 1 }}
              />
              <Chip
                label="Online Payment"
                variant={paymentMethod === 'ONLINE' ? 'filled' : 'outlined'}
                color={paymentMethod === 'ONLINE' ? 'primary' : 'default'}
                onClick={() => setPaymentMethod('ONLINE')}
                sx={{ flex: 1 }}
              />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1">Total:</Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                {formatCurrency(calculateTotal(cart))}
              </Typography>
            </Box>
            
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleCreateOrder}
              disabled={loading || processingPayment}
              startIcon={loading || processingPayment ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {processingPayment 
                ? 'Redirecting to payment...' 
                : paymentMethod === 'ONLINE' 
                  ? 'Pay with Stripe' 
                  : 'Place Order'}
            </Button>
          </Paper>
        </>
      )}
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header with search and cart */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={3}
      >
        <Typography variant="h4" fontWeight="bold">
          Pharmacy Store
        </Typography>
        
        <Box display="flex" alignItems="center">
          <TextField
            placeholder="Search medicines..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ mr: 2, width: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Tooltip title="View Cart">
            <IconButton 
              color="primary" 
              onClick={() => setCartOpen(true)}
              sx={{ 
                border: '1px solid',
                borderColor: 'primary.main',
                borderRadius: 2
              }}
            >
              <Badge badgeContent={cartItemsCount} color="error">
                <CartIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main content - Medicine cards */}
      {filteredMedicines.length === 0 ? (
        <Box textAlign="center" py={5}>
          <MedicineIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No medicines found matching "{searchTerm}"
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredMedicines.map((medicine) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={medicine.id}>
              <Card 
                elevation={3}
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                  }
                }}
              >
                <CardActionArea onClick={() => openMedicineDetail(medicine)}>
                  <CardMedia
                    component="div"
                    sx={{
                      height: 140,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'primary.light',
                      color: 'white'
                    }}
                  >
                    <MedicineIcon sx={{ fontSize: 60 }} />
                  </CardMedia>
                  <CardContent>
                    <Typography variant="h6" gutterBottom noWrap>
                      {medicine.name}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {medicine.generic_name || 'Generic name not available'}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {truncateText(medicine.description, 80) || 'No description available'}
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight="bold" color="primary.main">
                        {formatCurrency(medicine.price)}
                      </Typography>
                      
                      {medicine.is_expired ? (
                        <Chip size="small" color="error" label="Expired" />
                      ) : medicine.stock_quantity === 0 ? (
                        <Chip size="small" color="error" label="Out of Stock" />
                      ) : medicine.stock_quantity <= medicine.low_stock_threshold ? (
                        <Chip size="small" color="warning" label="Low Stock" />
                      ) : (
                        <Chip size="small" color="success" label="In Stock" />
                      )}
                    </Box>
                  </CardContent>
                </CardActionArea>
                
                <Box p={2} pt={0} mt="auto">
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(medicine);
                    }}
                    disabled={medicine.is_expired || medicine.stock_quantity === 0}
                  >
                    Add to Cart
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Medicine Detail Modal */}
      <MedicineDetail
        medicine={selectedMedicine}
        open={detailOpen}
        onClose={closeMedicineDetail}
        onAddToCart={handleAddToCart}
      />

      {/* Shopping Cart Drawer */}
      <Drawer
        anchor="right"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      >
        {cartContent}
      </Drawer>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MedicineList; 