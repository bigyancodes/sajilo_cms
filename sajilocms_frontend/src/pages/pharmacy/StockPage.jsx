// src/pages/pharmacy/StockPage.jsx
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import StockManagement from '../../components/pharmacy/StockManagement';

const StockPage = () => {
  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>Stock Management</Typography>
      <Paper sx={{ p: 3 }}>
        <StockManagement />
      </Paper>
    </Box>
  );
};

export default StockPage;
