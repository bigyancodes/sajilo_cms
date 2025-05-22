// src/components/pharmacy/StockManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, TextField, Grid, Paper, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, Select, MenuItem, Snackbar, Alert,
  Tabs, Tab, Divider, IconButton, Chip, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';

// Import the pharmacy service functions
import { 
  fetchMedicines, 
  fetchStockBatches, 
  createStockBatch, 
  fetchStockMovements, 
  createStockMovement 
} from '../../api/pharmacyService';

const StockManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [batches, setBatches] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [movements, setMovements] = useState([]);
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [openMovementDialog, setOpenMovementDialog] = useState(false);
  const [currentBatch, setCurrentBatch] = useState({ medicineId: '', batchNumber: '', quantity: 0, expiryDate: null, purchaseDate: new Date(), costPrice: 0, supplier: '' });
  const [currentMovement, setCurrentMovement] = useState({ medicineId: '', batchId: '', type: 'SALE', quantity: 0, date: new Date(), reference: '' });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Fetch medicines data
  const loadMedicines = async () => {
    try {
      const data = await fetchMedicines();
      setMedicines(data.results || []);
    } catch (err) {
      console.error('Failed to load medicines', err);
      setError('Failed to load medicines. Please try again.');
    }
  };

  // Fetch batches data
  const loadBatches = async () => {
    setLoading(true);
    try {
      const data = await fetchStockBatches();
      setBatches(data.results || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load batches', err);
      setError('Failed to load stock batches. Please try again.');
      setLoading(false);
    }
  };

  // Fetch movements data
  const loadMovements = async () => {
    setLoading(true);
    try {
      const data = await fetchStockMovements();
      setMovements(data.results || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load movements', err);
      setError('Failed to load stock movements. Please try again.');
      setLoading(false);
    }
  };

  // Load all data on component mount
  useEffect(() => {
    loadMedicines();
    loadBatches();
    loadMovements();
  }, []);

  // Batch dialog handlers
  const handleOpenBatchDialog = (batch = null) => {
    if (batch) {
      setCurrentBatch({ ...batch });
      setIsEditing(true);
    } else {
      setCurrentBatch({ medicineId: '', batchNumber: '', quantity: 0, expiryDate: null, purchaseDate: new Date(), costPrice: 0, supplier: '' });
      setIsEditing(false);
    }
    setOpenBatchDialog(true);
  };

  const handleCloseBatchDialog = () => {
    setOpenBatchDialog(false);
  };

  const handleBatchChange = (field) => (event) => {
    setCurrentBatch({ ...currentBatch, [field]: event.target.value });
  };

  const handleDateChange = (field) => (date) => {
    setCurrentBatch({ ...currentBatch, [field]: date });
  };

  const handleSaveBatch = async () => {
    try {
      if (isEditing) {
        // Update existing batch - API endpoint not implemented yet
        // For now, just update local state
        setBatches(batches.map(batch => batch.id === currentBatch.id ? currentBatch : batch));
        setNotification({ open: true, message: 'Batch updated successfully', severity: 'success' });
        handleCloseBatchDialog();
      } else {
        // Create new batch
        const batchData = {
          medicine: currentBatch.medicineId,
          batch_number: currentBatch.batchNumber,
          quantity: parseInt(currentBatch.quantity),
          cost_price: parseFloat(currentBatch.costPrice)
        };
        
        // Add dates if they're valid
        if (currentBatch.expiryDate) {
          batchData.expiry_date = new Date(currentBatch.expiryDate).toISOString().split('T')[0];
        }
        
        if (currentBatch.purchaseDate) {
          batchData.purchase_date = new Date(currentBatch.purchaseDate).toISOString().split('T')[0];
        }
        
        // Add supplier if provided
        if (currentBatch.supplier) {
          batchData.supplier = currentBatch.supplier.trim();
        }
        
        console.log('Sending batch data to API:', batchData);
        
        try {
          const response = await createStockBatch(batchData);
          
          // Add the new batch to the list
          setBatches(prev => [...prev, response.data]);
          
          setNotification({
            open: true,
            message: 'Batch added successfully',
            severity: 'success'
          });
          
          // Close the dialog and reset form
          handleCloseBatchDialog();
          
          // Also refresh the batches list to ensure we have the latest data
          loadBatches();
        } catch (createError) {
          console.error('Error creating batch:', createError);
          
          // Check if it's a unique constraint violation
          if (createError.response && createError.response.data && createError.response.data.non_field_errors) {
            const errorMsg = createError.response.data.non_field_errors[0];
            if (errorMsg.includes('unique') || errorMsg.includes('fields medicine, batch_number must make a unique set')) {
              setNotification({
                open: true,
                message: 'A batch with this number already exists for this medicine',
                severity: 'error'
              });
            } else {
              setNotification({
                open: true,
                message: errorMsg,
                severity: 'error'
              });
            }
          } else {
            setNotification({
              open: true,
              message: 'Failed to save batch: ' + (createError.message || 'Unknown error'),
              severity: 'error'
            });
          }
          
          // Refresh the batches list to ensure UI is in sync with backend
          // This is important since the batch might have been created despite the error
          loadBatches();
        }
      }
    } catch (err) {
      console.error('Error in handleSaveBatch:', err);
      setNotification({
        open: true,
        message: 'An unexpected error occurred',
        severity: 'error'
      });
      
      // Refresh the batches list to ensure UI is in sync with backend
      loadBatches();
    }
  };

  // Movement dialog handlers
  const handleOpenMovementDialog = () => {
    setCurrentMovement({ medicineId: '', batchId: '', type: 'SALE', quantity: 0, date: new Date(), reference: '' });
    setOpenMovementDialog(true);
  };

  const handleCloseMovementDialog = () => {
    setOpenMovementDialog(false);
  };

  const handleMovementChange = (field) => (event) => {
    setCurrentMovement({ ...currentMovement, [field]: event.target.value });
  };

  const handleMovementDateChange = (date) => {
    setCurrentMovement({ ...currentMovement, date });
  };

  const handleSaveMovement = async () => {
    try {
      // Prepare movement data for API
      const movementData = {
        medicine: parseInt(currentMovement.medicineId),
        batch: parseInt(currentMovement.batchId),
        movement_type: currentMovement.type,
        quantity: parseInt(currentMovement.quantity),
        date: currentMovement.date ? new Date(currentMovement.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        reference: currentMovement.reference || `MOV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      };
      
      // Debug log to see what we're sending
      console.log('Sending movement data to API:', movementData);
      
      // Create movement via API
      const response = await createStockMovement(movementData);
      console.log('Movement created successfully:', response);
      
      // Refresh data from the backend
      await loadBatches();
      await loadMovements();

      setNotification({ open: true, message: 'Stock movement recorded successfully', severity: 'success' });
      setOpenMovementDialog(false);
    } catch (err) {
      console.error('Error recording movement:', err);
      // Show more detailed error message if available
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || 'Failed to record movement. Please try again.';
      setNotification({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  // Helper to get medicine name by ID
  const getMedicineName = (id) => {
    const medicine = medicines.find(med => med.id === id);
    return medicine ? medicine.name : 'Unknown';
  };

  // Helper to get batch number by ID
  const getBatchNumber = (id) => {
    const batch = batches.find(b => b.id === id);
    return batch ? (batch.batchNumber || batch.batch_number) : (id ? `Batch #${id}` : 'Unknown');
  };

  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch (error) {
      console.error('Invalid date format:', date, error);
      return 'Invalid Date';
    }
  };

  // Get available batches for a medicine
  const getAvailableBatches = (medicineId) => {
    return batches.filter(batch => 
      batch.medicineId === parseInt(medicineId) && 
      batch.quantity > 0
    );
  };

  return (
    <Box>
      <Tabs value={tabValue} onChange={handleTabChange} aria-label="stock management tabs">
        <Tab label="Batches" />
        <Tab label="Movements" />
      </Tabs>
      
      <Divider />
      
      {/* Batches Tab */}
      {tabValue === 0 && (
        <Box sx={{ mt: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Medicine Batches</Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => handleOpenBatchDialog()}
            >
              Add New Batch
            </Button>
          </Box>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          ) : batches.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>No batches found. Add your first batch using the button above.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Medicine</TableCell>
                    <TableCell>Batch Number</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Purchase Date</TableCell>
                    <TableCell>Cost Price</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batches.map((batch) => {
                    const isExpiringSoon = batch.expiryDate && new Date(batch.expiryDate) < new Date(new Date().setMonth(new Date().getMonth() + 3));
                    const isLowStock = batch.quantity < 50;
                    
                    return (
                      <TableRow key={batch.id}>
                        <TableCell>{getMedicineName(batch.medicine || batch.medicineId)}</TableCell>
                        <TableCell>{batch.batchNumber || batch.batch_number}</TableCell>
                        <TableCell>
                          {batch.quantity}
                          {isLowStock && (
                            <Chip 
                              size="small" 
                              color="warning" 
                              icon={<WarningIcon />} 
                              label="Low" 
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDate(batch.expiryDate || batch.expiry_date)}
                          {isExpiringSoon && (
                            <Chip 
                              size="small" 
                              color="error" 
                              icon={<WarningIcon />} 
                              label="Expiring Soon" 
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>{formatDate(batch.purchaseDate || batch.purchase_date)}</TableCell>
                        <TableCell>
                          ${typeof (batch.costPrice || batch.cost_price) === 'number' 
                            ? (batch.costPrice || batch.cost_price).toFixed(2) 
                            : parseFloat(batch.costPrice || batch.cost_price || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleOpenBatchDialog(batch)}
                          >
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
      
      {/* Movements Tab */}
      {tabValue === 1 && (
        <Box sx={{ mt: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Stock Movements</Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={handleOpenMovementDialog}
              disabled={batches.length === 0}
            >
              Record Movement
            </Button>
          </Box>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          ) : movements.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>No stock movements found. Record a movement using the button above.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Medicine</TableCell>
                    <TableCell>Batch</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Reference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>{formatDate(movement.date)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={movement.type || movement.movement_type} 
                          color={(movement.type || movement.movement_type) === 'PURCHASE' ? 'success' : (movement.type || movement.movement_type) === 'SALE' ? 'primary' : 'warning'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{getMedicineName(movement.medicine || movement.medicineId)}</TableCell>
                      <TableCell>{getBatchNumber(movement.batch || movement.batchId)}</TableCell>
                      <TableCell>{movement.quantity}</TableCell>
                      <TableCell>{movement.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
      
      {/* Add Batch Dialog */}
      <Dialog open={openBatchDialog} onClose={handleCloseBatchDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Batch' : 'Add New Batch'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Medicine</InputLabel>
                <Select
                  value={currentBatch.medicineId}
                  onChange={handleBatchChange('medicineId')}
                  label="Medicine"
                  disabled={isEditing}
                >
                  {medicines.map(medicine => (
                    <MenuItem key={medicine.id} value={medicine.id}>{medicine.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Batch Number"
                value={currentBatch.batchNumber}
                onChange={handleBatchChange('batchNumber')}
                disabled={isEditing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={currentBatch.quantity}
                onChange={handleBatchChange('quantity')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cost Price"
                type="number"
                value={currentBatch.costPrice}
                onChange={handleBatchChange('costPrice')}
                InputProps={{
                  startAdornment: '$',
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Expiry Date"
                  value={currentBatch.expiryDate}
                  onChange={handleDateChange('expiryDate')}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Purchase Date"
                  value={currentBatch.purchaseDate}
                  onChange={handleDateChange('purchaseDate')}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={12}>
              <TextField
                fullWidth
                label="Supplier"
                value={currentBatch.supplier}
                onChange={handleBatchChange('supplier')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBatchDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveBatch} 
            variant="contained" 
            disabled={!currentBatch.medicineId || !currentBatch.batchNumber || currentBatch.quantity <= 0}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Movement Dialog */}
      <Dialog open={openMovementDialog} onClose={handleCloseMovementDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Record Stock Movement</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Movement Type</InputLabel>
                <Select
                  value={currentMovement.type}
                  onChange={handleMovementChange('type')}
                  label="Movement Type"
                >
                  <MenuItem value="SALE">Sale</MenuItem>
                  <MenuItem value="RETURN">Return</MenuItem>
                  <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
                  <MenuItem value="DAMAGED">Damaged/Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Medicine</InputLabel>
                <Select
                  value={currentMovement.medicineId}
                  onChange={handleMovementChange('medicineId')}
                  label="Medicine"
                >
                  {medicines.map(medicine => (
                    <MenuItem key={medicine.id} value={medicine.id}>{medicine.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {currentMovement.medicineId && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Batch</InputLabel>
                  <Select
                    value={currentMovement.batchId}
                    onChange={handleMovementChange('batchId')}
                    label="Batch"
                  >
                    {getAvailableBatches(currentMovement.medicineId).map(batch => (
                      <MenuItem key={batch.id} value={batch.id}>
                        {batch.batchNumber} (Qty: {batch.quantity}, Exp: {formatDate(batch.expiryDate)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={currentMovement.quantity}
                onChange={handleMovementChange('quantity')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date"
                  value={currentMovement.date}
                  onChange={handleMovementDateChange}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reference"
                value={currentMovement.reference}
                onChange={handleMovementChange('reference')}
                placeholder="e.g., Order number, Return ID"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMovementDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveMovement} 
            variant="contained" 
            disabled={
              !currentMovement.medicineId || 
              !currentMovement.batchId || 
              currentMovement.quantity <= 0
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StockManagement;
