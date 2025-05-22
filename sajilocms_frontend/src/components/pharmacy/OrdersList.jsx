import React, { useState, useEffect } from 'react';
import { pharmacyService } from '../../api/pharmacyService';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, Button, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions, Divider, 
  TablePagination
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';

// Mock data for orders if backend fails as fallback
const MOCK_ORDERS = [
  {
    id: 1,
    created_at: '2023-05-01T10:30:00Z',
    status: 'FULFILLED',
    total_amount: 35.97,
    items: [
      { id: 1, medicine_name: 'Paracetamol', quantity: 2, price: 5.99 },
      { id: 2, medicine_name: 'Amoxicillin', quantity: 1, price: 12.50 },
      { id: 3, medicine_name: 'Ibuprofen', quantity: 1, price: 7.25 }
    ]
  },
  {
    id: 2,
    created_at: '2023-05-05T14:20:00Z',
    status: 'PENDING',
    total_amount: 24.74,
    items: [
      { id: 4, medicine_name: 'Cetirizine', quantity: 1, price: 8.99 },
      { id: 5, medicine_name: 'Omeprazole', quantity: 1, price: 15.75 }
    ]
  },
  {
    id: 3,
    created_at: '2023-04-20T09:15:00Z',
    status: 'CANCELLED',
    total_amount: 18.49,
    items: [
      { id: 1, medicine_name: 'Paracetamol', quantity: 1, price: 5.99 },
      { id: 3, medicine_name: 'Ibuprofen', quantity: 1, price: 7.25 },
      { id: 4, medicine_name: 'Cetirizine', quantity: 1, price: 8.99 }
    ]
  }
];

const OrdersList = ({ isPharmacistView = false }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useMockData, setUseMockData] = useState(false); // Use real data from backend
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // If using mock data, don't even try to fetch from backend
      if (useMockData) {
        console.log('Using mock data for orders');
        setOrders(MOCK_ORDERS);
        setLoading(false);
        return;
      }
      
      try {
        // Try to get real data
        let params = {};
        
        if (!isPharmacistView) {
          // For patient view, use patient=current parameter
          // The API service will handle this special case
          params = { patient: 'current' };
        }
        
        console.log('Fetching orders with params:', params);
        const response = await pharmacyService.getOrders(params);
        
        console.log('Raw orders response:', response);
        
        // Process the response based on its structure
        let ordersList = [];
        
        if (response && response.results) {
          // DRF paginated response format
          ordersList = response.results;
        } else if (Array.isArray(response)) {
          // Direct array response
          ordersList = response;
        } else if (response && Array.isArray(response.data)) {
          // Axios wrapped response
          ordersList = response.data;
        } else if (response && response.data && response.data.results) {
          // Axios wrapped paginated response
          ordersList = response.data.results;
        } else {
          console.error('Unexpected response format:', response);
          throw new Error('Invalid data format received from server');
        }
        
        console.log('Processed orders:', ordersList);
        setOrders(ordersList);
      } catch (err) {
        console.error('Error fetching orders:', err);
        let errorMessage = 'Failed to fetch orders.';
        
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          if (err.response.status === 401) {
            errorMessage = 'You are not authorized to view orders. Please log in again.';
          } else if (err.response.status === 403) {
            errorMessage = 'You do not have permission to access orders.';
          } else if (err.response.status === 404) {
            errorMessage = 'Order data not found. The API endpoint may have changed.';
          } else {
            errorMessage = `Server error (${err.response.status}): ${err.response.data?.detail || err.message || 'Unknown error'}`;
          }
        } else if (err.request) {
          // The request was made but no response was received
          errorMessage = 'No response from server. Please check your network connection.';
        } else {
          // Something happened in setting up the request that triggered an Error
          errorMessage = err.message || 'Unknown error occurred';
        }
        
        setError(errorMessage);
        
        // Only fallback to mock data if explicitly enabled
        if (useMockData) {
          console.log('Using mock data as fallback');
          setOrders(MOCK_ORDERS);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    
    // Check if we should refresh orders from payment success
    const shouldRefresh = localStorage.getItem('refreshOrders') === 'true';
    if (shouldRefresh) {
      console.log('Refreshing orders after payment success...');
      // Clear the flag
      localStorage.removeItem('refreshOrders');
    }
  }, [isPharmacistView]);

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };

  const handleRefresh = () => {
    fetchOrders();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'FULFILLED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  // Filter for current page
  const displayedOrders = orders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" gutterBottom>
          {isPharmacistView ? 'All Medication Orders' : 'Your Medication Orders'}
        </Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={handleRefresh}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}
      
      {orders.length === 0 && !loading ? (
        <Alert severity="info">
          {isPharmacistView 
            ? "There are no medication orders in the system yet." 
            : "You don't have any medication orders yet."}
        </Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.light' }}>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Date</TableCell>
                  {isPharmacistView && <TableCell>Patient</TableCell>}
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedOrders.map((order) => (
                  <TableRow 
                    key={order.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      #{order.id}
                    </TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    {isPharmacistView && (
                      <TableCell>
                        {order.patient?.full_name || order.patient?.username || 'Unknown'}
                      </TableCell>
                    )}
                    <TableCell>
                      <Chip 
                        label={order.status} 
                        color={getStatusColor(order.status)} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="right">${parseFloat(order.total_amount).toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Button
                        startIcon={<VisibilityIcon />}
                        variant="text"
                        color="primary"
                        onClick={() => handleViewDetails(order)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={orders.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

      {/* Order Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Order Details #{selectedOrder?.id}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body1">
                  Date: {formatDate(selectedOrder.created_at)}
                </Typography>
                <Chip 
                  label={selectedOrder.status} 
                  color={getStatusColor(selectedOrder.status)} 
                  size="small" 
                />
              </Box>
              
              {isPharmacistView && selectedOrder.patient && (
                <Typography variant="body1" mb={2}>
                  Patient: {selectedOrder.patient.full_name || selectedOrder.patient.username || 'Unknown'}
                </Typography>
              )}
              
              <Typography variant="h6" gutterBottom>Order Items</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedOrder.items || selectedOrder.ordermedicine_set || []).map((item, index) => {
                      const medicine_name = item.medicine_name || item.medicine?.name || 'Unknown';
                      const quantity = item.quantity || 0;
                      const price = parseFloat(item.price || item.medicine?.price || 0);
                      
                      return (
                        <TableRow key={item.id || index}>
                          <TableCell>{medicine_name}</TableCell>
                          <TableCell align="right">{quantity}</TableCell>
                          <TableCell align="right">${price.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            ${(price * quantity).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Divider sx={{ my: 2 }} />
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6">${parseFloat(selectedOrder.total_amount).toFixed(2)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrdersList; 