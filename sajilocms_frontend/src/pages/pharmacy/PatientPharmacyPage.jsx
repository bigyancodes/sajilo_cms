import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import MedicineList from '../../components/pharmacy/MedicineList';
import OrderHistory from '../../components/pharmacy/OrderHistory';
import { useDocumentTitle } from '../../utils/hooks';

const PatientPharmacyPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    // Check if we have an activeTab in the location state (e.g., from redirect)
    return location.state?.activeTab || 0;
  });
  
  useDocumentTitle('Pharmacy - Sajilo CMS');

  // Update activeTab if location state changes
  useEffect(() => {
    if (location.state?.activeTab !== undefined) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab label="Browse Medicines" />
            <Tab label="Order History" />
          </Tabs>
        </Paper>

        {activeTab === 0 && <MedicineList />}
        {activeTab === 1 && <OrderHistory />}
      </Box>
    </Container>
  );
};

export default PatientPharmacyPage; 