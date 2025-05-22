import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Grid,
  Chip,
} from '@mui/material';
import { formatDate, formatCurrency } from '../../utils/dateUtils';

const MedicineDetail = ({ medicine, open, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);

  if (!medicine) return null;

  const handleAddToCart = () => {
    onAddToCart(medicine, quantity);
    onClose();
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= medicine.stock_quantity) {
      setQuantity(value);
    }
  };

  const isExpired = medicine.is_expired;
  const isOutOfStock = medicine.stock_quantity <= 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5">{medicine.name}</Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {medicine.generic_name}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            <Typography variant="body1" paragraph>
              {medicine.description || "No description available."}
            </Typography>

            <Typography variant="h6" gutterBottom>
              Details
            </Typography>
            <Box mb={2}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Manufacturer
                  </Typography>
                  <Typography variant="body1">
                    {medicine.manufacturer}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Category
                  </Typography>
                  <Typography variant="body1">
                    {medicine.category || "Not specified"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Manufacture Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(medicine.manufacture_date)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Expiration Date
                  </Typography>
                  <Typography variant="body1" color={isExpired ? "error" : "inherit"}>
                    {formatDate(medicine.expiration_date)}
                    {isExpired && " (Expired)"}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box 
              p={2} 
              borderRadius={1} 
              bgcolor="background.default"
              border="1px solid"
              borderColor="divider"
            >
              <Typography variant="h4" color="primary" gutterBottom align="center">
                {formatCurrency(medicine.price)}
              </Typography>
              
              <Box display="flex" justifyContent="center" mb={2}>
                {isExpired ? (
                  <Chip color="error" label="Expired" />
                ) : isOutOfStock ? (
                  <Chip color="error" label="Out of Stock" />
                ) : medicine.stock_quantity <= medicine.low_stock_threshold ? (
                  <Chip color="warning" label="Low Stock" />
                ) : (
                  <Chip color="success" label="In Stock" />
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                Available: {medicine.stock_quantity} units
              </Typography>
              
              <Box mt={3} mb={2}>
                <TextField
                  label="Quantity"
                  type="number"
                  fullWidth
                  value={quantity}
                  onChange={handleQuantityChange}
                  InputProps={{
                    inputProps: { min: 1, max: medicine.stock_quantity }
                  }}
                  disabled={isExpired || isOutOfStock}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleAddToCart}
          disabled={isExpired || isOutOfStock}
        >
          Add to Cart
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MedicineDetail; 