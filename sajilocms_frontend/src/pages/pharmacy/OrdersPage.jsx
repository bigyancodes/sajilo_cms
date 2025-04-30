import React, { useState, useEffect } from 'react';
import { pharmacyService } from '../../api/pharmacyService';
import { 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Box, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await pharmacyService.getOrders();
        setOrders(response.data.results || response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Failed to load orders. Please try again later.");
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleFulfillDialogOpen = (id) => {
    setSelectedOrderId(id);
    setDialogOpen(true);
  };

  const handleFulfillDialogClose = () => {
    setDialogOpen(false);
    setSelectedOrderId(null);
  };

  const handleFulfillOrder = async () => {
    try {
      await pharmacyService.fulfillOrder(selectedOrderId);
      setOrders(orders.map(order => 
        order.id === selectedOrderId 
          ? { ...order, status: 'FULFILLED' } 
          : order
      ));
      handleFulfillDialogClose();
    } catch (err) {
      console.error("Error fulfilling order:", err);
      setError("Failed to fulfill order. Please try again.");
    }
  };

  const getStatusChip = (status) => {
    switch(status) {
      case 'PENDING':
        return <Chip label="Pending" color="warning" size="small" />;
      case 'FULFILLED':
        return <Chip label="Fulfilled" color="success" size="small" />;
      case 'CANCELLED':
        return <Chip label="Cancelled" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error" variant="h6">{error}</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Pharmacy Orders
      </Typography>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.light' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Order ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Patient</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Created Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>{order.id}</TableCell>
                  <TableCell>{order.patient ? `${order.patient.first_name || ''} ${order.patient.last_name || ''}`.trim() || 'N/A' : 'N/A'}</TableCell>
                  <TableCell>{getStatusChip(order.status)}</TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {order.status === 'PENDING' && (
                      <Button 
                        variant="contained" 
                        color="success" 
                        size="small"
                        onClick={() => handleFulfillDialogOpen(order.id)}
                      >
                        Fulfill
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No orders found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Fulfill Order Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleFulfillDialogClose}
      >
        <DialogTitle>Fulfill Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to fulfill this order? This action will update the order status to fulfilled and adjust medication stock levels.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFulfillDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleFulfillOrder} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default OrdersPage; 