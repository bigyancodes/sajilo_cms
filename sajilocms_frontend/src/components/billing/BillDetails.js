import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBillDetails, createStripeCheckout } from '../../api/billingService';

const BillDetails = () => {
  const { billId } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchBillDetails = async () => {
      try {
        setLoading(true);
        console.log(`Fetching bill details for ID: ${billId}`);
        const response = await getBillDetails(billId);
        console.log('Bill details response:', response.data);
        setBill(response.data);
      } catch (err) {
        console.error('Error fetching bill details:', err);
        console.error('Error details:', err.response?.data || err.message);
        setError(`Could not load bill details. Error: ${err.response?.status || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (billId) {
      fetchBillDetails();
    } else {
      setError('No bill ID provided');
      setLoading(false);
    }
  }, [billId]);

  const handlePayment = async () => {
    try {
      setProcessing(true);
      console.log('Creating Stripe checkout session for bill:', billId);
      
      const response = await createStripeCheckout({
        bill_id: billId,
        success_url: `${window.location.origin}/payment-success`,
        cancel_url: `${window.location.origin}/payment-cancel`
      });
      
      console.log('Stripe checkout response:', response.data);
      
      if (response.data && response.data.checkout_url) {
        // Redirect to Stripe checkout
        console.log('Redirecting to Stripe checkout URL:', response.data.checkout_url);
        window.location.href = response.data.checkout_url;
      } else {
        console.error('No checkout URL received from Stripe');
        setError('Could not create payment session. Please try again.');
        setProcessing(false);
      }
    } catch (err) {
      console.error('Error creating payment session:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Could not process payment. Please try again later.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-red-50 rounded-lg border border-red-200">
        <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => navigate(-1)} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
        <h2 className="text-xl font-semibold text-yellow-700 mb-2">Bill Not Found</h2>
        <p className="text-yellow-600">The requested bill could not be found.</p>
        <button 
          onClick={() => navigate(-1)} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Bill Details</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Appointment Information</h2>
            {bill.appointment_details && (bill.appointment_details.appointment_date || bill.appointment_details.appointment_time) ? (
              <p className="text-sm text-gray-600">
                {bill.appointment_details.appointment_date} {bill.appointment_details.appointment_time ? `at ${bill.appointment_details.appointment_time}` : ''}
              </p>
            ) : bill.bill_date ? (
              <p className="text-sm text-gray-600">Bill Date: {bill.bill_date}</p>
            ) : (
              <p className="text-sm text-gray-600">Date and time not available</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            bill.status === 'PAID' ? 'bg-green-100 text-green-800' :
            bill.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
            bill.status === 'REFUNDED' ? 'bg-blue-100 text-blue-800' :
            'bg-red-100 text-red-800'
          }`}>
            {bill.status}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Doctor</h3>
            {bill.appointment_details && bill.appointment_details.doctor_name ? (
              <p className="text-base text-gray-800">
                {bill.appointment_details.doctor_name}
              </p>
            ) : (
              <p className="text-base text-gray-800">Doctor information not available</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Patient</h3>
            {bill.appointment_details && bill.appointment_details.patient_name ? (
              <>
                <p className="text-base text-gray-800">
                  {bill.appointment_details.patient_name}
                </p>
                {bill.appointment_details.patient_email && (
                  <p className="text-sm text-gray-600">
                    {bill.appointment_details.patient_email}
                  </p>
                )}
              </>
            ) : (
              <p className="text-base text-gray-800">Patient information not available</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Payment Details</h2>
        <div className="border-t border-b border-gray-200 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Consultation Fee</span>
            <span className="text-gray-800">
              NPR {typeof bill.amount === 'number' ? bill.amount.toLocaleString() : bill.amount}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Payment Method</span>
            <span className="text-gray-800">
              {bill.payment_method === 'STRIPE' ? 'Online Payment (Card)' : 
               bill.payment_method === 'CASH' ? 'Cash' : 
               bill.payment_method === 'INSURANCE' ? 'Insurance' : 
               bill.payment_method === 'LATER' ? 'Pay Later' : 
               bill.payment_method}
            </span>
          </div>
          {bill.notes && !bill.notes.includes('Session ID') && (
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <h3 className="text-sm font-medium text-gray-500">Notes</h3>
              <p className="text-sm text-gray-700">{bill.notes}</p>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center font-semibold text-lg mt-4">
          <span>Total</span>
          <span>NPR {typeof bill.amount === 'number' ? bill.amount.toLocaleString() : bill.amount}</span>
        </div>
      </div>
      
      {bill.status === 'PENDING' && (
        <div className="mt-8">
          <button
            onClick={handlePayment}
            disabled={processing}
            className={`w-full py-3 px-4 rounded-md text-white font-medium ${
              processing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {processing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Pay Now with Stripe'
            )}
          </button>
          <p className="text-sm text-gray-500 text-center mt-2">
            You will be redirected to Stripe to complete your payment securely.
          </p>
        </div>
      )}
      
      <div className="mt-6">
        <button 
          onClick={() => navigate(-1)} 
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default BillDetails;
