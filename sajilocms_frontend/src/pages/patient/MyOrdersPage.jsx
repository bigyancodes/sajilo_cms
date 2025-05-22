import React, { useEffect, useState } from 'react';

const MyOrdersPage = () => {
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Check if we should refresh orders from payment success
    const shouldRefresh = localStorage.getItem('refreshOrders') === 'true';
    // eslint-disable-next-line no-unused-vars
    const lastPaidBillingId = localStorage.getItem('lastPaidBillingId');
    
    if (shouldRefresh) {
      console.log('Refreshing orders after payment success...');
      // Clear the flag
      localStorage.removeItem('refreshOrders');
      
      // Set success message
      setSuccessMessage('Payment processed successfully!');
    }
  }, []);

  return (
    <div>
      {successMessage && <p>{successMessage}</p>}
      {/* Rest of the component */}
    </div>
  );
};

export default MyOrdersPage;