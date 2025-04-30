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

const BillingsPage = () => {
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBillingId, setSelectedBillingId] = useState(null);

  useEffect(() => {
    const fetchBillings = async () => {
      try {
        const response = await pharmacyService.getBillings();
        setBillings(response.data.results || response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching billings:", err);
        setError("Failed to load billing records. Please try again later.");
        setLoading(false);
      }
    };

    fetchBillings();
  }, []);

  const handleMarkAsPaidDialogOpen = (id) => {
    setSelectedBillingId(id);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedBillingId(null);
  };

  const handleMarkAsPaid = async () => {
    try {
      await pharmacyService.updateBilling(selectedBillingId, { payment_status: 'PAID' });
      setBillings(billings.map(billing => 
        billing.id === selectedBillingId 
          ? { ...billing, payment_status: 'PAID' } 
          : billing
      ));
      handleDialogClose();
    } catch (err) {
      console.error("Error updating billing:", err);
      setError("Failed to update payment status. Please try again.");
    }
  };

  const getStatusChip = (status) => {
    switch(status) {
      case 'PAID':
        return <Chip label="Paid" color="success" size="small" />;
      case 'UNPAID':
        return <Chip label="Unpaid" color="error" size="small" />;
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
        Billing Records
      </Typography>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.light' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Billing ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Order ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Total Amount</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Payment Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Created Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {billings.length > 0 ? (
              billings.map((billing) => (
                <TableRow key={billing.id} hover>
                  <TableCell>{billing.id}</TableCell>
                  <TableCell>{billing.order?.id || 'N/A'}</TableCell>
                  <TableCell>${parseFloat(billing.total_amount).toFixed(2)}</TableCell>
                  <TableCell>{getStatusChip(billing.payment_status)}</TableCell>
                  <TableCell>{new Date(billing.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {billing.payment_status === 'UNPAID' && (
                      <Button 
                        variant="contained" 
                        color="primary" 
                        size="small"
                        onClick={() => handleMarkAsPaidDialogOpen(billing.id)}
                      >
                        Mark as Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No billing records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Mark as Paid Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
      >
        <DialogTitle>Mark as Paid</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to mark this billing as paid? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleMarkAsPaid} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default BillingsPage; 