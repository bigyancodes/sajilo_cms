import { rootAxiosInstance } from "./axiosInstance";

const PRICING_URL = "/appointment/pricing/";
const BILLS_URL = "/appointment/bills/";
const STRIPE_URL = "/appointment/stripe/create-checkout/";

// Fetch doctor pricing
export const fetchDoctorPricing = (doctorId = null) => {
  let url = PRICING_URL;
  if (doctorId) {
    url += `?doctor_id=${doctorId}`;
  }
  return rootAxiosInstance.get(url);
};

// Create or update pricing
export const createPricing = (pricingData) => {
  return rootAxiosInstance.post(PRICING_URL, pricingData);
};

export const updatePricing = (id, pricingData) => {
  return rootAxiosInstance.put(`${PRICING_URL}${id}/`, pricingData);
};

// Bills management
export const fetchBills = (params = {}) => {
  const queryParams = new URLSearchParams();
  
  if (params.status) queryParams.append("status", params.status);
  if (params.payment_method) queryParams.append("payment_method", params.payment_method);
  
  const url = `${BILLS_URL}?${queryParams.toString()}`;
  return rootAxiosInstance.get(url);
};

// Get bills for the current patient
export const getBillsByPatient = () => {
  return rootAxiosInstance.get(`${BILLS_URL}patient/`);
};

export const getBillDetails = (id) => {
  // Ensure we're using the correct URL format
  const url = `${BILLS_URL}${id}/`;
  console.log(`Requesting bill details from: ${url}`);
  
  return rootAxiosInstance.get(url)
    .catch(error => {
      console.error(`Error fetching bill ${id}:`, error.response || error.message);
      // Try an alternative approach if the first one fails
      if (error.response && error.response.status === 404) {
        console.log('Trying alternative bill details endpoint...');
        return rootAxiosInstance.get(`/appointment/patient/bills/${id}/`);
      }
      throw error;
    });
};

export const markBillAsPaid = (id, paymentData) => {
  return rootAxiosInstance.post(`${BILLS_URL}${id}/mark_paid/`, paymentData);
};

// Stripe integration
export const createStripeCheckout = (billData) => {
  return rootAxiosInstance.post(STRIPE_URL, billData);
};

// Directly confirm a Stripe payment (backup for when webhook fails)
export const confirmStripePayment = (billId, paymentData) => {
  return rootAxiosInstance.post(`/appointment/stripe/confirm-payment/${billId}/`, paymentData);
};
