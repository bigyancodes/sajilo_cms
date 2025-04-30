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
  Chip,
  TextField,
  MenuItem,
  Grid
} from '@mui/material';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    model_name: ''
  });
  
  const modelTypes = ['Medicine', 'Order', 'Billing', 'StockTransaction'];
  const actionTypes = ['CREATE', 'UPDATE', 'DELETE'];

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const params = {};
        if (filters.action) params.action = filters.action;
        if (filters.model_name) params.model_name = filters.model_name;
        
        const response = await pharmacyService.getAuditLogs(params);
        setLogs(response.data.results || response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching audit logs:", err);
        setError("Failed to load audit logs. Please try again later.");
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getActionChip = (action) => {
    switch(action) {
      case 'CREATE':
        return <Chip label="Create" color="success" size="small" />;
      case 'UPDATE':
        return <Chip label="Update" color="primary" size="small" />;
      case 'DELETE':
        return <Chip label="Delete" color="error" size="small" />;
      default:
        return <Chip label={action} size="small" />;
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
      <Box p={3}>
        <Typography color="error" variant="h6">{error}</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Pharmacy Audit Logs
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              name="action"
              label="Action Type"
              value={filters.action}
              onChange={handleFilterChange}
              variant="outlined"
            >
              <MenuItem value="">All Actions</MenuItem>
              {actionTypes.map(action => (
                <MenuItem key={action} value={action}>
                  {action}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              name="model_name"
              label="Model Type"
              value={filters.model_name}
              onChange={handleFilterChange}
              variant="outlined"
            >
              <MenuItem value="">All Models</MenuItem>
              {modelTypes.map(model => (
                <MenuItem key={model} value={model}>
                  {model}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.light' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Model</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Object ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Performed By</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Timestamp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{getActionChip(log.action)}</TableCell>
                  <TableCell>{log.model_name}</TableCell>
                  <TableCell>{log.object_id}</TableCell>
                  <TableCell>{log.performed_by?.username || 'System'}</TableCell>
                  <TableCell sx={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.details}
                  </TableCell>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No audit logs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default AuditLogsPage; 