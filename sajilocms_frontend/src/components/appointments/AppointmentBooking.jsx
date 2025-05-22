import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { fetchDoctorById } from '../../api/axiosInstance';
import { fetchAvailableSlots, createAppointment } from '../../api/appointmentService';
import { fetchDoctorPricing } from '../../api/billingService';
import { formatTime, formatDateForInput } from '../../utils/dateUtils';

const AppointmentBooking = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [doctorPrice, setDoctorPrice] = useState(null);
  // Use the exact payment method values from the backend
  const [paymentMethod, setPaymentMethod] = useState('LATER');
  
  // For walk-in patients only (when used by receptionist/admin)
  const [patientInfo, setPatientInfo] = useState({
    patient_name: '',
    patient_email: '',
    patient_phone: ''
  });
  
  // Load doctor details and pricing
  useEffect(() => {
    const loadDoctor = async () => {
      if (!doctorId) return;
      
      try {
        setLoading(true);
        const [doctorResponse, pricingResponse] = await Promise.all([
          fetchDoctorById(doctorId),
          fetchDoctorPricing(doctorId)
        ]);
        
        setDoctor(doctorResponse.data);
        console.log("Doctor data loaded:", doctorResponse.data);
        
        // Set pricing if available
        if (pricingResponse.data && pricingResponse.data.length > 0) {
          setDoctorPrice(pricingResponse.data[0].price);
          console.log("Doctor pricing loaded:", pricingResponse.data[0]);
        }
      } catch (err) {
        console.error('Failed to load doctor or pricing:', err);
        setError('Could not load doctor information. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadDoctor();
  }, [doctorId]);
  
  // Load available slots when doctor or date changes
  useEffect(() => {
    const loadAvailableSlots = async () => {
      if (!doctorId) return;
      
      try {
        setLoadingSlots(true);
        setError('');
        
        console.log(`Fetching available slots for doctor ${doctorId} on ${date}`);
        const response = await fetchAvailableSlots(doctorId, date);
        console.log("Available slots response:", response.data);
        
        setAvailableSlots(response.data.slots || []);
        
        // If there's a message in the response, it might indicate no slots
        if (response.data.message && !response.data.slots?.length) {
          console.log("Message from API:", response.data.message);
        }
      } catch (err) {
        console.error('Failed to load available slots:', err);
        console.error('Error details:', err.response?.data || err.message);
        setError('Could not load available appointment slots. Please try again.');
      } finally {
        setLoadingSlots(false);
      }
    };
    
    if (doctorId && date) {
      loadAvailableSlots();
    }
  }, [doctorId, date]);
  
  const handlePatientInfoChange = (e) => {
    const { name, value } = e.target;
    setPatientInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedSlot) {
      setError('Please select an appointment time.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      // Prepare appointment data
      const appointmentData = {
        doctor: doctorId,
        appointment_time: selectedSlot.start,
        end_time: selectedSlot.end,
        reason: reason,
        payment_method: paymentMethod
      };
      
      // If user is not a patient, add walk-in patient info
      if (user.role !== 'PATIENT') {
        if (!patientInfo.patient_name || !patientInfo.patient_email) {
          setError('Patient name and email are required for walk-in appointments.');
          setSubmitting(false);
          return;
        }
        
        appointmentData.patient_name = patientInfo.patient_name;
        appointmentData.patient_email = patientInfo.patient_email;
        appointmentData.patient_phone = patientInfo.patient_phone;
      }
      
      console.log('Submitting appointment data:', appointmentData);
      const response = await createAppointment(appointmentData);
      console.log('Appointment created:', response.data);
      
      // If user chose to pay online and we have a price, redirect to payment
      if (response.data && paymentMethod === 'STRIPE' && doctorPrice) {
        // Navigate to payment page with the bill ID
        if (response.data.bill && response.data.bill.id) {
          // Don't show success message for Stripe payments, redirect immediately
          navigate(`/payment/${response.data.bill.id}`);
          return;
        } else {
          // If no bill was created but payment method is STRIPE, show error
          setError('Payment processing error: No bill was created for this appointment.');
          setSubmitting(false);
          return;
        }
      }
      
      // Only show success message for non-Stripe payments
      setSuccessMessage('Appointment booked successfully!');
      setSelectedSlot(null);
      setReason('');
      
      // Redirect to appointments page after a short delay
      setTimeout(() => {
        if (user.role === 'PATIENT') {
          navigate('/patient/appointments');
        } else if (user.role === 'RECEPTIONIST') {
          navigate('/receptionist/appointments');
        } else {
          navigate('/admin/appointments');
        }
      }, 2000);
      
    } catch (err) {
      console.error('Failed to book appointment:', err);
      if (err.response && err.response.data) {
        console.error('Server error details:', err.response.data);
        
        // Handle different error formats from the backend
        if (typeof err.response.data === 'string') {
          setError(err.response.data);
        } else if (err.response.data.error) {
          setError(err.response.data.error);
        } else if (err.response.data.detail) {
          setError(err.response.data.detail);
        } else if (err.response.data.payment_method) {
          // Handle specific validation errors for payment_method
          setError(`Payment method error: ${err.response.data.payment_method}`);
        } else if (err.response.data.non_field_errors) {
          setError(err.response.data.non_field_errors[0]);
        } else {
          // If there are multiple field errors, show them all
          const errorMessages = [];
          for (const field in err.response.data) {
            if (Array.isArray(err.response.data[field])) {
              errorMessages.push(`${field}: ${err.response.data[field].join(', ')}`);
            }
          }
          
          if (errorMessages.length > 0) {
            setError(errorMessages.join('\n'));
          } else {
            setError('Failed to book appointment. Please try again.');
          }
        }
      } else {
        setError('Failed to book appointment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!doctorId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-center mb-6">Book an Appointment</h2>
          <div className="text-center p-4">
            <p className="text-gray-600 mb-4">Please select a doctor to book an appointment with.</p>
            <button
              onClick={() => navigate('/doctors')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View Doctors
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <h2 className="text-2xl font-bold">Book an Appointment</h2>
          {doctor && (
            <p className="mt-2">
              with Dr. {doctor.full_name || `${doctor.first_name} ${doctor.last_name}`}
              {doctor.specialty && ` • ${doctor.specialty}`}
            </p>
          )}
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700">
              {successMessage}
            </div>
          )}
          
          {loading ? (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Loading doctor information...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Date Selection */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSelectedSlot(null); // Reset selected slot when date changes
                  }}
                  min={formatDateForInput(new Date())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Available Time Slots */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Available Time Slots
                </label>
                
                {loadingSlots ? (
                  <div className="p-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-600">Loading available slots...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-4 text-center bg-gray-50 rounded-md">
                    <p className="text-gray-600">No available slots for this date.</p>
                    <p className="text-sm text-gray-500 mt-1">Please try another date or contact the clinic.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2 text-center rounded-md transition-colors ${
                          selectedSlot === slot 
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                        }`}
                      >
                        {formatTime(slot.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Reason for Visit */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Reason for Visit
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Please briefly describe the reason for your visit"
                />
              </div>
              
              {/* Payment Method */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Payment Method
                </label>
                
                {doctorPrice ? (
                  <div className="mb-3 p-3 bg-blue-50 rounded-md">
                    <p className="font-medium text-blue-800">
                      Appointment Fee: NPR {parseFloat(doctorPrice).toLocaleString()}
                    </p>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="pay-later"
                          name="payment-method"
                          value="LATER"
                          checked={paymentMethod === 'LATER'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="pay-later" className="ml-2 block text-gray-700">
                          Pay Later (at clinic)
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="pay-online"
                          name="payment-method"
                          value="STRIPE"
                          checked={paymentMethod === 'STRIPE'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="pay-online" className="ml-2 block text-gray-700">
                          Pay Online (Credit/Debit Card)
                        </label>
                      </div>
                    </div>
                    
                    {paymentMethod === 'STRIPE' && (
                      <p className="mt-2 text-sm text-gray-600">
                        You will be redirected to Stripe to complete your payment after booking.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-gray-600">
                      No pricing information available for this doctor.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Walk-in Patient Info (for receptionist/admin only) */}
              {user && user.role !== 'PATIENT' && (
                <div className="mb-6 p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium text-gray-800 mb-2">Walk-in Patient Information</h3>
                  
                  <div className="mb-3">
                    <label className="block text-gray-700 text-sm mb-1">
                      Patient Name *
                    </label>
                    <input
                      type="text"
                      name="patient_name"
                      value={patientInfo.patient_name}
                      onChange={handlePatientInfoChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-gray-700 text-sm mb-1">
                      Patient Email *
                    </label>
                    <input
                      type="email"
                      name="patient_email"
                      value={patientInfo.patient_email}
                      onChange={handlePatientInfoChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="mb-1">
                    <label className="block text-gray-700 text-sm mb-1">
                      Patient Phone
                    </label>
                    <input
                      type="tel"
                      name="patient_phone"
                      value={patientInfo.patient_phone}
                      onChange={handlePatientInfoChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
              
              {/* Submit Button */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={submitting || !selectedSlot || loading || loadingSlots}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    (submitting || !selectedSlot || loading || loadingSlots) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {submitting ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentBooking;