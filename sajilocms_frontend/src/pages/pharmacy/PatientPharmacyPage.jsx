// src/pages/pharmacy/PatientPharmacyPage.jsx
import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Tabs, Tab, Divider
} from '@mui/material';
import MedicineList from '../../components/pharmacy/MedicineList';
import Cart from '../../components/pharmacy/Cart';
import OrderList from '../../components/pharmacy/OrderList';
import MedicationIcon from '@mui/icons-material/Medication';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';

const PatientPharmacyPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  return (
    <Box className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Pharmacy
        </Typography>
      </Box>
      
      <Paper sx={{ mt: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<MedicationIcon />} label="Browse Medicines" />
          <Tab icon={<ShoppingCartIcon />} label="My Cart" />
          <Tab icon={<ReceiptIcon />} label="My Orders" />
        </Tabs>
        
        <Divider />
        
        <Box p={3}>
          {activeTab === 0 && <MedicineList userRole="PATIENT" />}
          {activeTab === 1 && <Cart />}
          {activeTab === 2 && <OrderList />}
        </Box>
      </Paper>
    </Box>
  );
};

export default PatientPharmacyPage;
