import React, { useState, useEffect, useContext, useCallback } from 'react';
import { pharmacyService } from '../../api/pharmacyService';
import { AuthContext } from '../../context/AuthContext';
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
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
  Box,
  Chip,
  Alert,
  Snackbar
} from '@mui/material';
import { useLocation } from 'react-router-dom';

const StockPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const { user, refreshUser } = useContext(AuthContext);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const selectedMedicineId = queryParams.get('medicine');

  const [stockForm, setStockForm] = useState({
    medicine_id: selectedMedicineId || '',
    quantity: '',
    reason: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching data...');
      
      if (!user) {
        console.log('No user found, refreshing user...');
        await refreshUser();
      }

      const [medicinesResponse, transactionsResponse] = await Promise.all([
        pharmacyService.getMedicines(),
        pharmacyService.getStockTransactions()
      ]);

      console.log('Medicines fetched:', medicinesResponse);
      console.log('Transactions fetched:', transactionsResponse);

      const medicinesData = medicinesResponse.results || medicinesResponse;
      const transactionsData = transactionsResponse.results || transactionsResponse;

      setMedicines(Array.isArray(medicinesData) ? medicinesData : []);
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user, refreshUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStockForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    
    if (!stockForm.medicine_id || !stockForm.quantity) {
      setError("Please select a medicine and specify quantity");
      return;
    }

    try {
      setLoading(true);
      await pharmacyService.addStock({
        medicine_id: stockForm.medicine_id,
        quantity: parseInt(stockForm.quantity),
        reason: stockForm.reason || 'Stock addition'
      });
      
      setSuccessMessage('Stock added successfully');
      await fetchData();
      
      setStockForm({
        medicine_id: '',
        quantity: '',
        reason: ''
      });
      
      setError(null);
    } catch (err) {
      console.error("Error adding stock:", err);
      setError(err.message || "Failed to add stock. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessMessage = () => {
    setSuccessMessage('');
  };

  if (loading && !medicines.length && !transactions.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} p={3}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={fetchData}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" component="h1" gutterBottom>
        Stock Management
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add Stock
        </Typography>
        <form onSubmit={handleAddStock}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="Medicine"
                name="medicine_id"
                value={stockForm.medicine_id}
                onChange={handleInputChange}
                required
              >
                {medicines.map((medicine) => (
                  <MenuItem key={medicine.id} value={medicine.id}>
                    {medicine.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Quantity"
                name="quantity"
                type="number"
                value={stockForm.quantity}
                onChange={handleInputChange}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Reason"
                name="reason"
                value={stockForm.reason}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={loading}
              >
                Add Stock
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Stock Transactions
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Medicine</TableCell>
                <TableCell>Transaction Type</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Performed By</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.medicine?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={transaction.transaction_type} 
                      color={transaction.transaction_type === 'ADD' ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>{transaction.quantity}</TableCell>
                  <TableCell>{transaction.reason || 'N/A'}</TableCell>
                  <TableCell>
                    {transaction.performed_by ? 
                      `${transaction.performed_by.first_name || ''} ${transaction.performed_by.last_name || ''}`.trim() || 'N/A' 
                      : 'N/A'}
                  </TableCell>
                  <TableCell>{new Date(transaction.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Success Message */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSuccessMessage}
      >
        <Alert onClose={handleCloseSuccessMessage} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StockPage; 