// src/components/pharmacy/AddMedicineForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper, FormControl,
  InputLabel, Select, MenuItem, FormControlLabel, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
  Divider, Accordion, AccordionSummary, AccordionDetails, IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import apiClient from '../../utils/apiClient';
import CategoryManagement from './CategoryManagement';

const dosageForms = [
  'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT', 
  'DROPS', 'INHALER', 'POWDER', 'SOLUTION', 'SUSPENSION', 'OTHER'
];

const AddMedicineForm = ({ open, onClose, onSuccess }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [includeStock, setIncludeStock] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    manufacturer: '',
    description: '',
    dosage_form: '',
    strength: '',
    unit_price: '',
    category: '',
    prescription_required: false,
    in_stock: true
  });
  
  const [stockData, setStockData] = useState({
    batch_number: '',
    quantity: 0,
    expiry_date: null,
    purchase_date: new Date(),
    cost_price: 0,
    low_stock_threshold: 50
  });

  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/pharmacy/categories/');
        setCategories(response.data.results || []);
      } catch (err) {
        console.error('Failed to load categories', err);
        setError('Failed to load categories. Please try again.');
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle date changes for stock data
  const handleDateChange = (field, date) => {
    setStockData({
      ...stockData,
      [field]: date
    });
  };

  // Handle stock data changes
  const handleStockChange = (e) => {
    const { name, value } = e.target;
    setStockData({
      ...stockData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Format data for API - ensure all required fields are present and properly formatted
      const medicineData = {
        name: formData.name.trim(),
        generic_name: formData.generic_name.trim(),
        manufacturer: formData.manufacturer.trim(),
        description: formData.description.trim(),
        dosage_form: formData.dosage_form,
        strength: formData.strength.trim(),
        unit_price: parseFloat(formData.unit_price),
        category: parseInt(formData.category),
        prescription_required: formData.prescription_required,
        in_stock: formData.in_stock
      };

      console.log('Sending medicine data to API:', medicineData);
      
      // Step 1: Create the medicine
      const medicineResponse = await apiClient.post('/pharmacy/medicines/', medicineData);
      console.log('Medicine created successfully:', medicineResponse.data);
      const newMedicineId = medicineResponse.data.id;
      
      // Step 2: If including stock, create a stock batch
      if (includeStock && newMedicineId) {
        const batchData = {
          medicine: newMedicineId,
          batch_number: stockData.batch_number.trim(),
          quantity: parseInt(stockData.quantity),
          expiry_date: stockData.expiry_date ? new Date(stockData.expiry_date).toISOString().split('T')[0] : null,
          purchase_date: stockData.purchase_date ? new Date(stockData.purchase_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          cost_price: parseFloat(stockData.cost_price)
        };
        
        // Only include low_stock_threshold if it's a valid number
        if (stockData.low_stock_threshold && !isNaN(parseInt(stockData.low_stock_threshold))) {
          batchData.low_stock_threshold = parseInt(stockData.low_stock_threshold);
        }
        
        console.log('Sending batch data to API:', batchData);
        
        // Create the batch
        const batchResponse = await apiClient.post('/pharmacy/stock/batches/', batchData);
        console.log('Batch created successfully:', batchResponse.data);
        
        // Create a PURCHASE movement record
        const movementData = {
          medicine: newMedicineId,
          batch: batchResponse.data.id,
          movement_type: 'PURCHASE',
          quantity: parseInt(stockData.quantity),
          date: batchData.purchase_date,
          reference: `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        };
        
        console.log('Sending movement data to API:', movementData);
        await apiClient.post('/pharmacy/stock/movements/', movementData);
      }
      
      setLoading(false);
      
      // Reset form
      setFormData({
        name: '',
        generic_name: '',
        manufacturer: '',
        description: '',
        dosage_form: '',
        strength: '',
        unit_price: '',
        category: '',
        prescription_required: false,
        in_stock: true
      });
      
      setStockData({
        batch_number: '',
        quantity: 0,
        expiry_date: null,
        purchase_date: new Date(),
        cost_price: 0,
        low_stock_threshold: 50
      });
      
      setIncludeStock(false);
      
      // Notify parent component of success
      if (onSuccess) onSuccess();
      
      // Close dialog
      onClose();
    } catch (err) {
      setLoading(false);
      console.error('Error adding medicine:', err);
      
      // Extract detailed error information from the response
      let errorMessage = 'Failed to add medicine. Please try again.';
      
      if (err.response) {
        console.log('Error response data:', err.response.data);
        
        // Handle different error formats
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (typeof err.response.data === 'object') {
          // Handle field-specific validation errors
          const fieldErrors = [];
          for (const [field, errors] of Object.entries(err.response.data)) {
            if (Array.isArray(errors)) {
              fieldErrors.push(`${field}: ${errors.join(', ')}`);
            } else if (typeof errors === 'string') {
              fieldErrors.push(`${field}: ${errors}`);
            }
          }
          
          if (fieldErrors.length > 0) {
            errorMessage = `Validation errors: ${fieldErrors.join('; ')}`;
          }
        }
      }
      
      setError(errorMessage);
    }
  };

  // Handle category added/updated/deleted
  const handleCategoryChange = () => {
    // Refresh the categories list
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/pharmacy/categories/');
        setCategories(response.data.results || []);
      } catch (err) {
        console.error('Failed to refresh categories', err);
      }
    };

    fetchCategories();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Add New Medicine</DialogTitle>
        <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Medicine Name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="generic_name"
                label="Generic Name"
                value={formData.generic_name}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="manufacturer"
                label="Manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    label="Category"
                    sx={{ flexGrow: 1 }}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <IconButton 
                    color="primary" 
                    onClick={() => setOpenCategoryDialog(true)}
                    sx={{ ml: 1 }}
                    title="Manage Categories"
                  >
                    <AddCircleOutlineIcon />
                  </IconButton>
                </Box>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Dosage Form</InputLabel>
                <Select
                  name="dosage_form"
                  value={formData.dosage_form}
                  onChange={handleChange}
                  label="Dosage Form"
                >
                  {dosageForms.map((form) => (
                    <MenuItem key={form} value={form}>
                      {form.charAt(0) + form.slice(1).toLowerCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="strength"
                label="Strength (e.g., 500mg, 5ml)"
                value={formData.strength}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="unit_price"
                label="Unit Price"
                type="number"
                value={formData.unit_price}
                onChange={handleChange}
                fullWidth
                required
                InputProps={{
                  startAdornment: 'NPR ',
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="prescription_required"
                      checked={formData.prescription_required}
                      onChange={handleChange}
                    />
                  }
                  label="Prescription Required"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      name="in_stock"
                      checked={formData.in_stock}
                      onChange={handleChange}
                    />
                  }
                  label="In Stock"
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeStock}
                    onChange={(e) => setIncludeStock(e.target.checked)}
                    name="includeStock"
                  />
                }
                label="Add Initial Stock"
              />
            </Grid>
            
            {includeStock && (
              <Grid item xs={12}>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">Stock Information</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="batch_number"
                          label="Batch Number"
                          value={stockData.batch_number}
                          onChange={handleStockChange}
                          fullWidth
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="quantity"
                          label="Quantity"
                          type="number"
                          value={stockData.quantity}
                          onChange={handleStockChange}
                          fullWidth
                          required
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Expiry Date"
                            value={stockData.expiry_date}
                            onChange={(date) => handleDateChange('expiry_date', date)}
                            renderInput={(params) => <TextField {...params} fullWidth required />}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                required: true
                              }
                            }}
                          />
                        </LocalizationProvider>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Purchase Date"
                            value={stockData.purchase_date}
                            onChange={(date) => handleDateChange('purchase_date', date)}
                            renderInput={(params) => <TextField {...params} fullWidth required />}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                required: true
                              }
                            }}
                          />
                        </LocalizationProvider>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="cost_price"
                          label="Cost Price"
                          type="number"
                          value={stockData.cost_price}
                          onChange={handleStockChange}
                          fullWidth
                          required
                          InputProps={{
                            startAdornment: 'NPR ',
                          }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="low_stock_threshold"
                          label="Low Stock Threshold"
                          type="number"
                          value={stockData.low_stock_threshold}
                          onChange={handleStockChange}
                          fullWidth
                          required
                          helperText="Quantity below which stock is considered low"
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            )}
          </Grid>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Medicine'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Category Management Dialog */}
    <CategoryManagement 
      open={openCategoryDialog} 
      onClose={() => setOpenCategoryDialog(false)} 
      onCategoryAdded={handleCategoryChange} 
    />
    </>
  );
};

export default AddMedicineForm;
