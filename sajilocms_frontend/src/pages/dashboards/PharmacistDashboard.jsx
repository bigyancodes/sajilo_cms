import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Drawer, List, ListItem, ListItemButton, 
  ListItemIcon, ListItemText, Divider, AppBar, Toolbar, IconButton,
  Grid, Card, CardContent, CircularProgress, Alert,
  Tabs, Tab
} from "@mui/material";
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';

// Import MUI icons
import MedicationIcon from '@mui/icons-material/Medication';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';
import InventoryIcon from '@mui/icons-material/Inventory';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PaymentIcon from '@mui/icons-material/Payment';
import WarningIcon from '@mui/icons-material/Warning';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';

// Import pharmacy pages
import MedicinesPage from "../../pages/pharmacy/MedicinesPage";
import OrdersPage from "../../pages/pharmacy/OrdersPage";
import BillingsPage from "../../pages/pharmacy/BillingsPage";
import StockPage from "../../pages/pharmacy/StockPage";

// Import pharmacy service
import apiClient from '../../utils/apiClient';

const drawerWidth = 240;

const PharmacistDashboard = () => {
  const [stats, setStats] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pharmacyTab, setPharmacyTab] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch dashboard stats
        const statsResponse = await apiClient.get('/pharmacy/dashboard/stats/');
        setStats(statsResponse.data);

        // Fetch all medicines to find low stock and in-stock items
        const allMedicinesResponse = await apiClient.get('/pharmacy/medicines/?limit=1000');
        if (allMedicinesResponse.data && allMedicinesResponse.data.results) {
          const allMedicines = allMedicinesResponse.data.results;
          
          // Filter for low stock items based on available_stock property
          const lowStock = allMedicines.filter(med => {
            const availableStock = med.available_stock || 0;
            return availableStock > 0 && availableStock <= med.minimum_stock_level;
          });
          setLowStockItems(lowStock);
          
          // Count in-stock medicines
          const inStockCount = allMedicines.filter(med => med.is_in_stock === true).length;
          
          // Update stats with correct in-stock count
          setStats(prevStats => ({
            ...prevStats,
            in_stock_count: inStockCount
          }));
        } else {
          setLowStockItems([]);
        }

        // Fetch recent orders
        const ordersResponse = await apiClient.get('/pharmacy/orders/?limit=5&ordering=-created_at');
        setRecentOrders(ordersResponse.data.results || []);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err.response?.data?.detail || "Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Dashboard overview component with statistics
  const Overview = () => {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to Pharmacy Dashboard
        </Typography>
        <Typography variant="body1" paragraph>
          Hello Pharmacist, use the sidebar to navigate to different pharmacy functions.
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        ) : (
          <>
            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Total Medicines</Typography>
                    <Typography variant="h3">{stats?.total_medicines || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>In Stock</Typography>
                    <Typography variant="h3">{stats?.in_stock_medicines || 0}</Typography>
                    <Typography variant="caption">
                      {stats?.in_stock_medicines > 0 ? 'Medicines with available stock' : 'No medicines in stock'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Pending Orders</Typography>
                    <Typography variant="h3">{stats?.pending_orders || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Typography variant="h6" gutterBottom>Low Stock Items</Typography>
                      {lowStockItems?.length > 0 && (
                        <WarningIcon sx={{ ml: 1, color: 'error.dark' }} />
                      )}
                    </Box>
                    <Typography variant="h3">{stats?.low_stock_medicines || lowStockItems?.length || 0}</Typography>
                    <Typography variant="caption">
                      {lowStockItems?.length > 0 ? 'Medicines need restocking' : 'No low stock items'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Quick Access Cards */}
            <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>Quick Access</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 3 }}>
              <Paper 
                sx={{ 
                  p: 3, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-5px)', boxShadow: 3 }
                }}
                onClick={() => navigate('medicines')}
              >
                <MedicationIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6">Medicines</Typography>
                <Typography variant="body2" align="center">
                  View and manage medicine inventory
                </Typography>
              </Paper>

              <Paper 
                sx={{ 
                  p: 3, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-5px)', boxShadow: 3 }
                }}
                onClick={() => navigate('orders')}
              >
                <ShoppingCartIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6">Orders</Typography>
                <Typography variant="body2" align="center">
                  View and manage customer orders
                </Typography>
              </Paper>

              <Paper 
                sx={{ 
                  p: 3, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-5px)', boxShadow: 3 }
                }}
                onClick={() => navigate('billings')}
              >
                <PaymentIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6">Billings</Typography>
                <Typography variant="body2" align="center">
                  Manage payments and invoices
                </Typography>
              </Paper>

              <Paper 
                sx={{ 
                  p: 3, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-5px)', boxShadow: 3 }
                }}
                onClick={() => navigate('stock')}
              >
                <InventoryIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6">Stock</Typography>
                <Typography variant="body2" align="center">
                  Manage inventory and stock levels
                </Typography>
              </Paper>
            </Box>
          </>
        )}
      </Box>
    );
  };

  // Create the drawer content with navigation links
  const drawer = (
    <div>
      <Toolbar sx={{ justifyContent: 'center' }}>
        <Typography variant="h6" noWrap component="div">
          Pharmacy Panel
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname === '/pharmacist' || location.pathname === '/pharmacist/'}
            onClick={() => navigate('')}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname.includes('/pharmacist/medicines')}
            onClick={() => navigate('medicines')}
          >
            <ListItemIcon>
              <MedicationIcon />
            </ListItemIcon>
            <ListItemText primary="Medicines" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname.includes('/pharmacist/orders')}
            onClick={() => navigate('orders')}
          >
            <ListItemIcon>
              <ShoppingCartIcon />
            </ListItemIcon>
            <ListItemText primary="Orders" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname.includes('/pharmacist/stock')}
            onClick={() => navigate('stock')}
          >
            <ListItemIcon>
              <InventoryIcon />
            </ListItemIcon>
            <ListItemText primary="Stock" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname.includes('/pharmacist/billings')}
            onClick={() => navigate('billings')}
          >
            <ListItemIcon>
              <PaymentIcon />
            </ListItemIcon>
            <ListItemText primary="Billings" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname.includes('/pharmacist/categories')}
            onClick={() => navigate('categories')}
          >
            <ListItemIcon>
              <CategoryIcon />
            </ListItemIcon>
            <ListItemText primary="Categories" />
          </ListItemButton>
        </ListItem>

        <Divider sx={{ my: 1 }} />
        
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname === '/profile'}
            onClick={() => navigate('/profile')}
          >
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="My Profile" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Pharmacy Management System
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar /> {/* This is for spacing below the AppBar */}
        
        {/* Routes for different pharmacy pages */}
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="medicines" element={
            <div className="bg-white rounded-lg shadow">
              <Tabs 
                value={pharmacyTab} 
                onChange={(e, newValue) => setPharmacyTab(newValue)} 
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
              >
                <Tab label="Medicines" />
                <Tab label="Categories" />
              </Tabs>
              
              <Divider />
              
              <Box className="p-4">
                {pharmacyTab === 0 && <MedicinesPage />}
                {pharmacyTab === 1 && <div>Category Management</div>}
              </Box>
            </div>
          } />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="billings" element={<BillingsPage />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default PharmacistDashboard;
