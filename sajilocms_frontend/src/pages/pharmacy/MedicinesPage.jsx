import React, { useState, useEffect, useContext } from 'react';
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
  CircularProgress,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Tooltip,
  Snackbar,
  Alert,
  MenuItem
} from '@mui/material';
import { Link } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import InventoryIcon from '@mui/icons-material/Inventory';

const MedicinesPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingMedicine, setEditingMedicine] = useState(null);
  const { user, refreshUser } = useContext(AuthContext);

  const [medicineForm, setMedicineForm] = useState({
    name: '',
    generic_name: '',
    description: '',
    manufacturer: '',
    manufacture_date: '',
    expiration_date: '',
    price: '',
    stock_quantity: '',
    low_stock_threshold: '',
    category: '',
    barcode: ''
  });

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching medicines...');
      
      if (!user) {
        console.log('No user found, refreshing user...');
        await refreshUser();
      }

      const response = await pharmacyService.getMedicines();
      console.log('Medicines fetched:', response);
      const medicinesData = response.results || response;
      setMedicines(Array.isArray(medicinesData) ? medicinesData : []);
    } catch (err) {
      console.error('Error fetching medicines:', err);
      setError(err.message || 'Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (medicine = null) => {
    if (medicine) {
      setEditingMedicine(medicine);
      setMedicineForm({
        name: medicine.name,
        generic_name: medicine.generic_name || '',
        description: medicine.description || '',
        manufacturer: medicine.manufacturer,
        manufacture_date: medicine.manufacture_date,
        expiration_date: medicine.expiration_date,
        price: medicine.price,
        stock_quantity: medicine.stock_quantity,
        low_stock_threshold: medicine.low_stock_threshold,
        category: medicine.category || '',
        barcode: medicine.barcode || ''
      });
    } else {
      setEditingMedicine(null);
      setMedicineForm({
        name: '',
        generic_name: '',
        description: '',
        manufacturer: '',
        manufacture_date: '',
        expiration_date: '',
        price: '',
        stock_quantity: '',
        low_stock_threshold: '',
        category: '',
        barcode: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMedicine(null);
    setMedicineForm({
      name: '',
      generic_name: '',
      description: '',
      manufacturer: '',
      manufacture_date: '',
      expiration_date: '',
      price: '',
      stock_quantity: '',
      low_stock_threshold: '',
      category: '',
      barcode: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMedicineForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Format dates to YYYY-MM-DD
      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      // Build the base form data
      const formData = {
        name: medicineForm.name.trim(),
        manufacturer: medicineForm.manufacturer.trim(),
        manufacture_date: formatDate(medicineForm.manufacture_date),
        expiration_date: formatDate(medicineForm.expiration_date),
        price: parseFloat(medicineForm.price) || 0,
        stock_quantity: parseInt(medicineForm.stock_quantity) || 0,
        low_stock_threshold: parseInt(medicineForm.low_stock_threshold) || 10,
        generic_name: medicineForm.generic_name?.trim() || '',
        description: medicineForm.description?.trim() || '',
        category: medicineForm.category?.trim() || ''
      };

      // Only add barcode if it's provided and not empty
      const barcode = medicineForm.barcode?.trim();
      if (barcode) {
        formData.barcode = barcode;
      }

      // Validate required fields
      const requiredFields = ['name', 'manufacturer', 'manufacture_date', 'expiration_date', 'price'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      if (missingFields.length > 0) {
        setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Validate dates
      const manufactureDate = new Date(formData.manufacture_date);
      const expirationDate = new Date(formData.expiration_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time part for proper date comparison

      if (manufactureDate > today) {
        setError('Manufacture date cannot be in the future');
        return;
      }

      if (expirationDate < today) {
        setError('Expiration date cannot be in the past');
        return;
      }

      if (manufactureDate > expirationDate) {
        setError('Manufacture date cannot be after expiration date');
        return;
      }

      // Validate numeric fields
      if (formData.price < 0) {
        setError('Price cannot be negative');
        return;
      }

      if (formData.stock_quantity < 0) {
        setError('Stock quantity cannot be negative');
        return;
      }

      if (formData.low_stock_threshold < 0) {
        setError('Low stock threshold cannot be negative');
        return;
      }

      console.log('Submitting form data:', formData);

      if (editingMedicine) {
        await pharmacyService.updateMedicine(editingMedicine.id, formData);
        setSuccessMessage('Medicine updated successfully');
      } else {
        await pharmacyService.createMedicine(formData);
        setSuccessMessage('Medicine added successfully');
      }
      
      await fetchMedicines();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving medicine:', err);
      // Handle specific error cases
      if (err.response?.data?.error) {
        if (typeof err.response.data.error === 'object') {
          // Handle field-specific errors
          const errorMessages = Object.entries(err.response.data.error)
            .map(([field, message]) => `${field}: ${message}`)
            .join('\n');
          setError(errorMessages);
        } else {
          // Handle string error messages
          setError(err.response.data.error);
        }
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to save medicine');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessMessage = () => {
    setSuccessMessage('');
  };

  if (loading && !medicines.length) {
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
        <Button variant="contained" onClick={fetchMedicines}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Medicines
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Medicine
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Generic Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {medicines.map((medicine) => (
              <TableRow key={medicine.id}>
                <TableCell>{medicine.name}</TableCell>
                <TableCell>{medicine.generic_name}</TableCell>
                <TableCell>{medicine.category}</TableCell>
                <TableCell>
                  <Typography
                    color={medicine.stock_quantity <= medicine.low_stock_threshold ? 'error' : 'inherit'}
                  >
                    {medicine.stock_quantity} {medicine.stock_quantity <= medicine.low_stock_threshold ? '(Low)' : ''}
                  </Typography>
                </TableCell>
                <TableCell>${medicine.price}</TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Tooltip title="Add Stock">
                      <IconButton
                        component={Link}
                        to={`/pharmacy/stock?medicine=${medicine.id}`}
                        color="primary"
                      >
                        <InventoryIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton 
                        color="primary"
                        onClick={() => handleOpenDialog(medicine)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Medicine Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={medicineForm.name}
                onChange={handleInputChange}
                required
                helperText="Enter the medicine name"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Generic Name"
                name="generic_name"
                value={medicineForm.generic_name}
                onChange={handleInputChange}
                helperText="Enter the generic/scientific name"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={medicineForm.description}
                onChange={handleInputChange}
                multiline
                rows={2}
                helperText="Enter a brief description of the medicine"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Manufacturer"
                name="manufacturer"
                value={medicineForm.manufacturer}
                onChange={handleInputChange}
                required
                helperText="Enter the manufacturer's name"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Category"
                name="category"
                value={medicineForm.category}
                onChange={handleInputChange}
                helperText="Enter the medicine category (e.g., Antibiotics, Painkillers)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Manufacture Date"
                name="manufacture_date"
                type="date"
                value={medicineForm.manufacture_date}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
                helperText="Select the manufacture date"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Expiration Date"
                name="expiration_date"
                type="date"
                value={medicineForm.expiration_date}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
                helperText="Select the expiration date"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Price"
                name="price"
                type="number"
                value={medicineForm.price}
                onChange={handleInputChange}
                required
                inputProps={{ min: 0, step: "0.01" }}
                helperText="Enter the price (must be non-negative)"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Stock Quantity"
                name="stock_quantity"
                type="number"
                value={medicineForm.stock_quantity}
                onChange={handleInputChange}
                required
                inputProps={{ min: 0 }}
                helperText="Enter initial stock quantity"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Low Stock Threshold"
                name="low_stock_threshold"
                type="number"
                value={medicineForm.low_stock_threshold}
                onChange={handleInputChange}
                required
                inputProps={{ min: 0 }}
                helperText="Enter threshold for low stock warning"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Barcode (Optional)"
                name="barcode"
                value={medicineForm.barcode}
                onChange={handleInputChange}
                helperText="Optional: Enter a unique barcode for inventory tracking. Leave empty if not using barcodes."
                error={error?.includes('barcode')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {editingMedicine ? 'Update' : 'Add'} Medicine
          </Button>
        </DialogActions>
      </Dialog>

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

export default MedicinesPage; 