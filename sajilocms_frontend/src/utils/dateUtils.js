// src/utils/dateUtils.js
export const formatAppointmentTime = (isoDateString) => {
    if (!isoDateString) return '';
    
    // Parse the ISO string and format it consistently
    const date = new Date(isoDateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  
  // Helper for splitting into date and time parts
  export const getDateAndTime = (isoDateString) => {
    const formatted = formatAppointmentTime(isoDateString);
    const parts = formatted.split(',');
    
    // Check if we have enough parts
    if (parts.length < 3) {
      return { date: formatted, time: '' };
    }
    
    // Combine first two parts for date, use last part for time
    const date = `${parts[0]},${parts[1]}`;
    const time = parts[2].trim();
    
    return {
      date: date.trim(),
      time: time
    };
  };
  
  // Format just the time portion
  export const formatTime = (isoDateString) => {
    if (!isoDateString) return '';
    
    const date = new Date(isoDateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  
  // Format date for input fields (YYYY-MM-DD)
  export const formatDateForInput = (date) => {
    if (!date) return '';
    
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${year}-${month}-${day}`;
  };