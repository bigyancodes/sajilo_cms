// src/pages/pharmacy/BillingsPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Chip, Button, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
  TextField, Grid, CircularProgress, Alert
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalPrintshopIcon from '@mui/icons-material/LocalPrintshop';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import apiClient from '../../utils/apiClient';

const BillingsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [expandedPayment, setExpandedPayment] = useState(null);
  
  // Update payment dialog
  const [updateDialog, setUpdateDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentData, setPaymentData] = useState({
    status: '',
    transaction_id: '',
    notes: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Fetch payments
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/pharmacy/payments/');
      setPayments(response.data.results);
      setLoading(false);
    } catch (err) {
      setError('Failed to load payments');
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPayments();
  }, []);
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get payment status chip color
  const getStatusColor = (status) => {
    switch(status) {
      case 'SUCCESS': return 'success';
      case 'PENDING': return 'warning';
      case 'FAILED': return 'error';
      case 'CANCELLED': return 'default';
      case 'REFUNDED': return 'info';
      default: return 'default';
    }
  };
  
  // Handle edit button click
  const handleEditClick = (payment) => {
    setSelectedPayment(payment);
    setPaymentData({
      status: payment.status,
      transaction_id: payment.transaction_id || '',
      notes: payment.notes || ''
    });
    setUpdateDialog(true);
  };
  
  // Handle update payment
  const handleUpdatePayment = async () => {
    if (!selectedPayment) return;
    
    setUpdateLoading(true);
    try {
      await apiClient.patch(`/pharmacy/payments/${selectedPayment.id}/`, paymentData);
      setSuccess('Payment updated successfully');
      setUpdateDialog(false);
      fetchPayments(); // Refresh payments
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update payment');
      setTimeout(() => setError(null), 3000);
    } finally {
      setUpdateLoading(false);
    }
  };
  
  // Handle print invoice
  const handlePrintInvoice = (payment) => {
    // In a real app, you would generate a PDF or open a print view
    // This is just a placeholder
    console.log('Printing invoice for payment:', payment.id);
    alert('Invoice printing functionality would be implemented here.');
  };
  
  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" mb={3}>
        <ReceiptIcon sx={{ mr: 1 }} />
        <Typography variant="h5">Payment & Billing Management</Typography>
      </Box>
      
      {/* Success/Error messages */}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* Search/Filter (you could expand this) */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search payments..."
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
              // Implementation would require state and filter function
            />
          </Grid>
        </Grid>
      </Paper>
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : payments.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Payment ID</TableCell>
                <TableCell>Order #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <React.Fragment key={payment.id}>
                  <TableRow>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => setExpandedPayment(expandedPayment === payment.id ? null : payment.id)}
                      >
                        {expandedPayment === payment.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{payment.id.substring(0, 8)}...</TableCell>
                    <TableCell>{payment.order_number}</TableCell>
                    <TableCell>{formatDate(payment.created_at)}</TableCell>
                    <TableCell>{payment.payment_method}</TableCell>
                    <TableCell>NPR {payment.amount}</TableCell>
                    <TableCell>
                      <Chip 
                        label={payment.status} 
                        color={getStatusColor(payment.status)} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditClick(payment)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handlePrintInvoice(payment)}
                        >
                          <LocalPrintshopIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded details */}
                  {expandedPayment === payment.id && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 0 }}>
                        <Box sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" color="text.secondary">
                                Transaction ID
                              </Typography>
                              <Typography>
                                {payment.transaction_id || 'N/A'}
                              </Typography>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" color="text.secondary">
                                Gateway Response
                              </Typography>
                              <Typography>
                                {payment.payment_gateway_response ? 'Available' : 'N/A'}
                              </Typography>
                            </Grid>
                            
                            {payment.notes && (
                              <Grid item xs={12}>
                                <Typography variant="subtitle2" color="text.secondary">
                                  Notes
                                </Typography>
                                <Typography>
                                  {payment.notes}
                                </Typography>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">No payments found</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            There are no payment records in the system yet.
          </Typography>
        </Paper>
      )}
      
      {/* Edit Payment Dialog */}
      <Dialog open={updateDialog} onClose={() => setUpdateDialog(false)}>
        <DialogTitle>Update Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Payment Status</InputLabel>
                <Select
                  labelId="status-label"
                  value={paymentData.status}
                  onChange={(e) => setPaymentData({...paymentData, status: e.target.value})}
                  label="Payment Status"
                >
                  <MenuItem value="SUCCESS">Success</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="FAILED">Failed</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  <MenuItem value="REFUNDED">Refunded</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Transaction ID"
                value={paymentData.transaction_id}
                onChange={(e) => setPaymentData({...paymentData, transaction_id: e.target.value})}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleUpdatePayment}
            disabled={updateLoading}
          >
            {updateLoading ? <CircularProgress size={24} /> : 'Update Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BillingsPage;
