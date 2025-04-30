// src/pages/dashboards/PharmacistDashboard.jsx
import React, { useState, useContext } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Box, 
  Typography, 
  Paper, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  AppBar,
  Toolbar,
  IconButton
} from "@mui/material";

// Import MUI icons
import MedicationIcon from '@mui/icons-material/Medication';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';
import InventoryIcon from '@mui/icons-material/Inventory';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';

// Import pharmacy pages
import MedicinesPage from "../pharmacy/MedicinesPage";
import OrdersPage from "../pharmacy/OrdersPage";
import BillingsPage from "../pharmacy/BillingsPage";
import StockPage from "../pharmacy/StockPage";
import { AuthContext } from "../../context/AuthContext";

const drawerWidth = 240;

const PharmacistDashboard = () => {
  const { user } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Dashboard overview component
  const Overview = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Welcome to Pharmacy Dashboard
      </Typography>
      <Typography variant="body1" paragraph>
        Hello {user?.first_name || 'Pharmacist'}, use the sidebar to navigate to different pharmacy functions.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 3, mt: 4 }}>
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
            Manage and fulfill patient orders
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
          <ReceiptIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6">Billings</Typography>
          <Typography variant="body2" align="center">
            Manage payment records
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
    </Box>
  );

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Pharmacy Portal
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname === '/pharmacist'} 
            component={Link} 
            to="/pharmacist"
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname === '/pharmacist/medicines'} 
            component={Link} 
            to="/pharmacist/medicines"
          >
            <ListItemIcon>
              <MedicationIcon />
            </ListItemIcon>
            <ListItemText primary="Medicines" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname === '/pharmacist/orders'} 
            component={Link} 
            to="/pharmacist/orders"
          >
            <ListItemIcon>
              <ShoppingCartIcon />
            </ListItemIcon>
            <ListItemText primary="Orders" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname === '/pharmacist/billings'} 
            component={Link} 
            to="/pharmacist/billings"
          >
            <ListItemIcon>
              <ReceiptIcon />
            </ListItemIcon>
            <ListItemText primary="Billings" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={location.pathname === '/pharmacist/stock'} 
            component={Link} 
            to="/pharmacist/stock"
          >
            <ListItemIcon>
              <InventoryIcon />
            </ListItemIcon>
            <ListItemText primary="Stock" />
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
          display: { sm: 'none' }
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
            Pharmacy Portal
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
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

      <Box
        component="main"
        sx={{ flexGrow: 1, width: { sm: `calc(100% - ${drawerWidth}px)` }, mt: { xs: 7, sm: 0 } }}
      >
        <Toolbar sx={{ display: { sm: 'none' } }} />
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="medicines" element={<MedicinesPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="billings" element={<BillingsPage />} />
          <Route path="stock" element={<StockPage />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default PharmacistDashboard;