import React from 'react';
import { Link } from 'react-router-dom';

const PaymentCancel = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-block rounded-full bg-yellow-100 p-3 mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Cancelled</h2>
          <p className="text-gray-600 mb-6">
            Your payment was not completed. Your appointment is still booked, but payment will be required at the clinic.
          </p>
          
          <div className="flex flex-col space-y-3">
            <Link 
              to="/patient/appointments" 
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View My Appointments
            </Link>
            <button 
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
