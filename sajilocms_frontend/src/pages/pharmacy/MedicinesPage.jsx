// src/pages/pharmacy/MedicinesPage.jsx
import React, { useState } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MedicineList from '../../components/pharmacy/MedicineList';
import AddMedicineForm from '../../components/pharmacy/AddMedicineForm';

const MedicinesPage = () => {
  const [addMedicineOpen, setAddMedicineOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle successful medicine addition
  const handleMedicineAdded = () => {
    // Refresh the medicine list by changing the key
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Medicines Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setAddMedicineOpen(true)}
        >
          Add Medicine
        </Button>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <MedicineList userRole="PHARMACIST" key={refreshKey} />
      </Paper>

      {/* Add Medicine Dialog */}
      <AddMedicineForm 
        open={addMedicineOpen} 
        onClose={() => setAddMedicineOpen(false)}
        onSuccess={handleMedicineAdded}
      />
    </Box>
  );
};

export default MedicinesPage;
