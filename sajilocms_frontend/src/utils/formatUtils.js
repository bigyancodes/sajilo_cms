// formatUtils.js - Contains utility functions for formatting data

// Format a date in a human-readable format
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

// Format currency in USD format
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

// Calculate total price from a cart object
export const calculateTotal = (cart, items) => {
  if (!cart || !items || !Array.isArray(items)) return 0;
  
  return Object.entries(cart).reduce((total, [id, quantity]) => {
    const item = items.find(i => i.id.toString() === id.toString());
    return total + (item && typeof item.price === 'number' ? item.price * quantity : 0);
  }, 0);
};

// Truncate text to a specific length and add ellipsis
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength) + '...';
}; 