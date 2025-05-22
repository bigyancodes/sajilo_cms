// src/routes/pharmacyRoutes.js
import React from 'react';
import { Navigate } from 'react-router-dom';

// Pharmacy pages
import PatientPharmacyPage from '../pages/pharmacy/PatientPharmacyPage';
import MedicinesPage from '../pages/pharmacy/MedicinesPage';
import OrdersPage from '../pages/pharmacy/OrdersPage';
import BillingsPage from '../pages/pharmacy/BillingsPage';
import StockPage from '../pages/pharmacy/StockPage';
import CategoriesPage from '../pages/pharmacy/CategoriesPage';

// Role-based components from existing dashboards
import PatientDashboard from '../pages/dashboards/PatientDashboard';
import PharmacistDashboard from '../pages/dashboards/PharmacistDashboard';

// Route definitions for pharmacy
const pharmacyRoutes = [
  // Patient routes
  {
    path: '/patient/pharmacy',
    element: <PatientPharmacyPage />,
    requiredRoles: ['PATIENT']
  },
  
  // Pharmacist routes
  {
    path: '/pharmacist',
    element: <PharmacistDashboard />,
    requiredRoles: ['PHARMACIST', 'ADMIN']
  },
  {
    path: '/pharmacist/medicines',
    element: <MedicinesPage />,
    requiredRoles: ['PHARMACIST', 'ADMIN']
  },
  {
    path: '/pharmacist/orders',
    element: <OrdersPage />,
    requiredRoles: ['PHARMACIST', 'ADMIN']
  },
  {
    path: '/pharmacist/billings',
    element: <BillingsPage />,
    requiredRoles: ['PHARMACIST', 'ADMIN']
  },
  {
    path: '/pharmacist/stock',
    element: <StockPage />,
    requiredRoles: ['PHARMACIST', 'ADMIN']
  },
  {
    path: '/pharmacist/categories',
    element: <CategoriesPage />,
    requiredRoles: ['PHARMACIST', 'ADMIN']
  },
  
  // Receptionist routes (minimal pharmacy access through their dashboard)
  {
    path: 'receptionist/pharmacy',
    element: <Navigate to="/receptionist" />, // Redirect to receptionist dashboard
    requiredRoles: ['RECEPTIONIST']
  }
];

// Export the pharmacy routes to be included in the main routes
export default pharmacyRoutes;
