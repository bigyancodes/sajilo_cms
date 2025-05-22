import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  HistoryEdu as HistoryIcon,
} from '@mui/icons-material';
import OrderDetail from './OrderDetail';
import { formatDate, formatCurrency } from '../../utils/dateUtils';
import pharmacyService from '../../api/pharmacyService';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Memoize filterOrders to avoid dependency issues
  const filterOrders = React.useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredOrders(orders);
      return;
    }
    
    const filtered = orders.filter(order => 
      order.id.toString().includes(searchTerm) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOrders(filtered);
  }, [searchTerm, orders]);

  useEffect(() => {
    if (orders.length) {
      filterOrders();
    }
  }, [searchTerm, orders, filterOrders]);

  const fetchOrders = async () => {
    try {
      const response = await pharmacyService.getOrders();
      const data = response.data || response;
      setOrders(data.results || data);
      setFilteredOrders(data.results || data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch orders');
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'FULFILLED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleViewDetail = (orderId) => {
    setSelectedOrderId(orderId);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
  };

  const handleViewInvoice = async (billingId) => {
    try {
      const data = await pharmacyService.getInvoice(billingId);
      // Since we don't have a direct invoice_url in the API response,
      // we'll just show the order details for now
      handleViewDetail(data.order_id || data.order?.id);
    } catch (err) {
      console.error('Failed to fetch invoice:', err);
    }
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={3}
      >
        <Typography variant="h4" fontWeight="bold">
          Order History
        </Typography>
        
        <TextField
          placeholder="Search orders..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ width: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      {filteredOrders.length === 0 ? (
        <Box textAlign="center" py={5}>
          <HistoryIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? `No orders found matching "${searchTerm}"` : 'No order history available'}
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.light' }}>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold" color="white">
                    Order ID
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold" color="white">
                    Date
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold" color="white">
                    Status
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold" color="white">
                    Total Amount
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="subtitle2" fontWeight="bold" color="white">
                    Actions
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow 
                  key={order.id}
                  hover
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                  onClick={() => handleViewDetail(order.id)}
                >
                  <TableCell>
                    <Typography fontWeight="medium">#{order.id}</Typography>
                  </TableCell>
                  <TableCell>
                    {formatDate(order.created_at)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.status}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {order.billing ? formatCurrency(order.billing.total_amount) : 'N/A'}
                  </TableCell>
                  <TableCell align="center">
                    <Box>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(order.id);
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {order.billing && (
                        <Tooltip title="View Invoice">
                          <IconButton 
                            size="small" 
                            color="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewInvoice(order.billing.id);
                            }}
                          >
                            <ReceiptIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      <OrderDetail 
        orderId={selectedOrderId}
        open={detailOpen}
        onClose={handleCloseDetail}
      />
    </Box>
  );
};

export default OrderHistory; 