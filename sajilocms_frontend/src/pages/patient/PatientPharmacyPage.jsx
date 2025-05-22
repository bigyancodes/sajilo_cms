import React, { useState } from 'react';
import { 
  Box, Typography, Tab, Tabs, Paper, Container, Divider
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import OrderMedicinePage from './OrderMedicinePage';
import OrdersList from '../../components/pharmacy/OrdersList';

const PatientPharmacyPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Paper sx={{ p: { xs: 2, md: 3 }, mt: 2, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <LocalPharmacyIcon color="primary" sx={{ fontSize: 32, mr: 1 }} />
          <Typography variant="h4" component="h1">
            Pharmacy Services
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              icon={<ShoppingCartIcon />}
              label="Order Medicines" 
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
            <Tab 
              icon={<ReceiptIcon />}
              label="My Orders" 
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
          </Tabs>
        </Box>
        
        <Box>
          {activeTab === 0 && <OrderMedicinePage />}
          {activeTab === 1 && <OrdersList />}
        </Box>
      </Paper>
    </Container>
  );
};

export default PatientPharmacyPage; 