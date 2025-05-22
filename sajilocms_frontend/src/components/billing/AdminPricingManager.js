import React, { useState, useEffect } from 'react';
import { rootAxiosInstance } from '../../api/axiosInstance';
import { fetchDoctorPricing, createPricing, updatePricing } from '../../api/billingService';
import { toast } from 'react-toastify';

const AdminPricingManager = () => {
  const [doctors, setDoctors] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    doctor: '',
    price: '',
    description: '',
    is_active: true
  });

  // Load doctors and pricing data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch doctors and pricing data in parallel
        const [doctorsResponse, pricingResponse] = await Promise.all([
          rootAxiosInstance.get('/auth/doctors/'),
          fetchDoctorPricing()
        ]);
        
        setDoctors(doctorsResponse.data);
        setPricing(pricingResponse.data);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Could not load doctors or pricing information.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Reset form to default values
  const resetForm = () => {
    setFormData({
      doctor: '',
      price: '',
      description: '',
      is_active: true
    });
    setIsEditing(false);
    setEditId(null);
  };
  
  // Load pricing data for editing
  const handleEdit = (priceItem) => {
    setFormData({
      doctor: priceItem.doctor,
      price: priceItem.price,
      description: priceItem.description || '',
      is_active: priceItem.is_active
    });
    setIsEditing(true);
    setEditId(priceItem.id);
  };
  
  // Submit the form for create/update
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.doctor || !formData.price) {
      setError('Doctor and price are required.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      const formattedData = {
        ...formData,
        price: parseFloat(formData.price)
      };
      
      let response;
      if (isEditing) {
        response = await updatePricing(editId, formattedData);
        
        // Update the pricing list
        setPricing(pricing.map(item => 
          item.id === editId ? response.data : item
        ));
        toast.success('Pricing updated successfully');
      } else {
        response = await createPricing(formattedData);
        
        // Add to the pricing list
        setPricing([...pricing, response.data]);
        toast.success('Pricing created successfully');
      }
      
      // Reset the form
      resetForm();
    } catch (err) {
      console.error('Failed to save pricing:', err);
      setError(err.response?.data?.error || 'Failed to save pricing information.');
      toast.error('Failed to save pricing information');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Appointment Pricing</h2>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
          <button 
            className="ml-2 text-red-800 underline" 
            onClick={() => setError('')}
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Pricing Form */}
      <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">
          {isEditing ? 'Edit Price' : 'Set New Price'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="doctor">
              Doctor
            </label>
            <select
              id="doctor"
              name="doctor"
              value={formData.doctor}
              onChange={handleChange}
              disabled={isEditing || submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a doctor</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.first_name} {doctor.last_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="price">
              Price (NPR)
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min="0"
              step="1"
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
            Description
          </label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            disabled={submitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Standard consultation fee"
          />
        </div>
        
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            disabled={submitting}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700" htmlFor="is_active">
            Active
          </label>
        </div>
        
        <div className="flex justify-end space-x-3">
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {submitting ? 'Saving...' : isEditing ? 'Update Price' : 'Save Price'}
          </button>
        </div>
      </form>
      
      {/* Pricing Table */}
      <h3 className="text-lg font-semibold mb-4">Current Pricing</h3>
      
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading pricing information...</p>
        </div>
      ) : pricing.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-md">
          <p className="text-gray-600">No pricing information has been set up yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pricing.map((price) => (
                <tr key={price.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {price.doctor_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      NPR {parseFloat(price.price).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {price.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      price.is_active 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {price.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(price)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPricingManager;
