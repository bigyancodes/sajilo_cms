// src/components/pharmacy/CategoryManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Divider, Snackbar, Alert, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../../utils/apiClient';

const CategoryManagement = ({ open, onClose, onCategoryAdded }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({ name: '', description: '' });
  
  // Fetch categories when component mounts
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);
  
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/pharmacy/categories/');
      setCategories(response.data.results || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load categories', err);
      setError('Failed to load categories. Please try again.');
      setLoading(false);
    }
  };
  
  const handleOpenAddDialog = () => {
    setCurrentCategory({ name: '', description: '' });
    setOpenAddDialog(true);
  };
  
  const handleOpenEditDialog = (category) => {
    setCurrentCategory(category);
    setOpenEditDialog(true);
  };
  
  const handleOpenDeleteDialog = (category) => {
    setCurrentCategory(category);
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDialogs = () => {
    setOpenAddDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentCategory({
      ...currentCategory,
      [name]: value
    });
  };
  
  const handleAddCategory = async () => {
    try {
      setLoading(true);
      await apiClient.post('/pharmacy/categories/', {
        name: currentCategory.name.trim(),
        description: currentCategory.description.trim()
      });
      
      await fetchCategories();
      setNotification({ open: true, message: 'Category added successfully', severity: 'success' });
      handleCloseDialogs();
      
      // Notify parent component if needed
      if (onCategoryAdded) onCategoryAdded();
      
    } catch (err) {
      console.error('Error adding category:', err);
      setNotification({ 
        open: true, 
        message: err.response?.data?.detail || 'Failed to add category', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditCategory = async () => {
    try {
      setLoading(true);
      await apiClient.put(`/pharmacy/categories/${currentCategory.id}/`, {
        name: currentCategory.name.trim(),
        description: currentCategory.description.trim()
      });
      
      await fetchCategories();
      setNotification({ open: true, message: 'Category updated successfully', severity: 'success' });
      handleCloseDialogs();
      
      // Notify parent component if needed
      if (onCategoryAdded) onCategoryAdded();
      
    } catch (err) {
      console.error('Error updating category:', err);
      setNotification({ 
        open: true, 
        message: err.response?.data?.detail || 'Failed to update category', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteCategory = async () => {
    try {
      setLoading(true);
      await apiClient.delete(`/pharmacy/categories/${currentCategory.id}/`);
      
      await fetchCategories();
      setNotification({ open: true, message: 'Category deleted successfully', severity: 'success' });
      handleCloseDialogs();
      
      // Notify parent component if needed
      if (onCategoryAdded) onCategoryAdded();
      
    } catch (err) {
      console.error('Error deleting category:', err);
      setNotification({ 
        open: true, 
        message: err.response?.data?.detail || 'Failed to delete category. It may be in use by medicines.', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };
  
  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Manage Medicine Categories</Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
            >
              Add Category
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loading && !openAddDialog && !openEditDialog && !openDeleteDialog ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          ) : categories.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>No categories found. Add your first category using the button above.</Alert>
          ) : (
            <List>
              {categories.map((category) => (
                <React.Fragment key={category.id}>
                  <ListItem>
                    <ListItemText 
                      primary={category.name} 
                      secondary={category.description || 'No description'} 
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleOpenEditDialog(category)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" onClick={() => handleOpenDeleteDialog(category)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Category Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              name="name"
              label="Category Name"
              value={currentCategory.name}
              onChange={handleInputChange}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              name="description"
              label="Description"
              value={currentCategory.description}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={3}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button 
            onClick={handleAddCategory} 
            variant="contained" 
            color="primary"
            disabled={!currentCategory.name.trim() || loading}
          >
            {loading ? 'Adding...' : 'Add Category'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Category Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              name="name"
              label="Category Name"
              value={currentCategory.name}
              onChange={handleInputChange}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              name="description"
              label="Description"
              value={currentCategory.description}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={3}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button 
            onClick={handleEditCategory} 
            variant="contained" 
            color="primary"
            disabled={!currentCategory.name.trim() || loading}
          >
            {loading ? 'Updating...' : 'Update Category'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Category Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDialogs}>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the category "{currentCategory.name}"?
            This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Note: If this category is used by any medicines, the deletion will fail.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button 
            onClick={handleDeleteCategory} 
            variant="contained" 
            color="error"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CategoryManagement;
