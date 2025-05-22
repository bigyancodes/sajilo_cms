// src/pages/pharmacy/OrdersPage.jsx
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import OrderList from '../../components/pharmacy/OrderList';

const OrdersPage = () => {
  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>Order Management</Typography>
      <Paper sx={{ p: 3 }}>
        <OrderList />
      </Paper>
    </Box>
  );
};

export default OrdersPage;
