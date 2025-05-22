import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import { formatDate, formatCurrency } from '../../utils/dateUtils';
import pharmacyService from '../../api/pharmacyService';

const OrderDetail = ({ orderId, open, onClose }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize fetchOrderDetail to avoid dependency issues
  const fetchOrderDetail = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await pharmacyService.getOrder(orderId);
      
      setOrder(response.data || response);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch order details');
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetail();
    }
  }, [open, orderId, fetchOrderDetail]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'FULFILLED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleViewInvoice = async () => {
    if (!order || !order.billing) return;
    
    try {
      await pharmacyService.getInvoice(order.billing.id);
      // If we have a downloadable invoice URL we would use it here
      // For now, we'll just show an alert
      alert('Invoice viewing is not yet implemented in the frontend');
    } catch (err) {
      console.error('Failed to fetch invoice:', err);
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'CASH_ON_DELIVERY':
        return 'Cash on Delivery';
      case 'ONLINE':
        return 'Online Payment';
      default:
        return method;
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Order Details</Typography>
          {order && (
            <Chip
              label={order.status}
              color={getStatusColor(order.status)}
              size="small"
            />
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : order ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Order Information
              </Typography>
              <Box component={Paper} p={2} variant="outlined">
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Order ID</Typography>
                    <Typography variant="body1">{order.id}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Date</Typography>
                    <Typography variant="body1">{formatDate(order.created_at)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Status</Typography>
                    <Chip
                      label={order.status}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Total</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {formatCurrency(order.total_amount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">Payment Method</Typography>
                    <Typography variant="body1">
                      {getPaymentMethodLabel(order.payment_method)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">Delivery Address</Typography>
                    <Typography variant="body1">
                      {order.delivery_address || 'Not specified'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Patient Information
              </Typography>
              <Box component={Paper} p={2} variant="outlined">
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Name</Typography>
                    <Typography variant="body1">
                      {order.patient?.first_name} {order.patient?.last_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Patient ID</Typography>
                    <Typography variant="body1">{order.patient?.id}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">Email</Typography>
                    <Typography variant="body1">{order.patient?.email}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Order Items
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell component="th" scope="row">
                          {item.medicine?.name || item.medicine_name}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        ) : (
          <Typography variant="body1">No order data available</Typography>
        )}
      </DialogContent>
      
      <DialogActions>
        {order && order.billing && (
          <Button
            color="primary"
            onClick={handleViewInvoice}
            disabled={!order.billing}
          >
            View Invoice
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderDetail; 