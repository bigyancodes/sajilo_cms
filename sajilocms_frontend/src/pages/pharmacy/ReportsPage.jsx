import React, { useState, useEffect } from 'react';
import { pharmacyService } from '../../api/pharmacyService';
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
  Tabs,
  Tab,
  Chip,
  Alert
} from '@mui/material';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pharmacy-tabpanel-${index}`}
      aria-labelledby={`pharmacy-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const ReportsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [stockReport, setStockReport] = useState([]);
  const [expiredMedicines, setExpiredMedicines] = useState([]);
  const [mostUsedMedicines, setMostUsedMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const [stockRes, expiredRes, usageRes] = await Promise.all([
          pharmacyService.getStockReport(),
          pharmacyService.getExpiredMedicines(),
          pharmacyService.getMostUsedMedicines()
        ]);
        
        setStockReport(stockRes.data);
        setExpiredMedicines(expiredRes.data);
        setMostUsedMedicines(usageRes.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching reports:", err);
        setError("Failed to load reports. Please try again later.");
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error" variant="h6">{error}</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Pharmacy Reports
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Stock Levels" />
          <Tab label="Expired Medicines" />
          <Tab label="Most Used Medicines" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>Current Stock Levels</Typography>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.light' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Medicine Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Stock Quantity</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Low Stock Threshold</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stockReport.length > 0 ? (
                stockReport.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.stock_quantity}</TableCell>
                    <TableCell>{item.low_stock_threshold}</TableCell>
                    <TableCell>
                      {item.stock_quantity <= item.low_stock_threshold ? (
                        <Chip label="Low Stock" color="error" size="small" />
                      ) : (
                        <Chip label="In Stock" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No stock data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>Expired Medicines</Typography>
        {expiredMedicines.length > 0 ? (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.light' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Medicine Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Manufacturer</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Expiration Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Stock Quantity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expiredMedicines.map((medicine) => (
                  <TableRow key={medicine.id} hover>
                    <TableCell>{medicine.name}</TableCell>
                    <TableCell>{medicine.manufacturer}</TableCell>
                    <TableCell>{new Date(medicine.expiration_date).toLocaleDateString()}</TableCell>
                    <TableCell>{medicine.stock_quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="success" sx={{ mt: 2 }}>
            No expired medicines found in inventory
          </Alert>
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>Most Used Medicines</Typography>
        {mostUsedMedicines.length > 0 ? (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.light' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Medicine Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Manufacturer</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Usage Count</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Current Stock</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mostUsedMedicines.map((medicine) => (
                  <TableRow key={medicine.id} hover>
                    <TableCell>{medicine.name}</TableCell>
                    <TableCell>{medicine.manufacturer}</TableCell>
                    <TableCell>{medicine.usage_count || 'N/A'}</TableCell>
                    <TableCell>{medicine.stock_quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No medicine usage data available
          </Alert>
        )}
      </TabPanel>
    </Paper>
  );
};

export default ReportsPage; 