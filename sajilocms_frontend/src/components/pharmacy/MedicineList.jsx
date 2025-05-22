// src/components/pharmacy/MedicineList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../utils/apiClient';

// Medicine card component
const MedicineCard = ({ medicine, userRole, onAddToCart }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      {/* Card Header */}
      <div className="p-4 relative">
        {medicine.prescription_required && (
          <span className="absolute top-3 right-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Prescription Required
          </span>
        )}
        
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{medicine.name}</h3>
            <p className="text-sm text-gray-500 truncate">{medicine.generic_name}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Strength:</span>
            <span className="font-medium text-gray-900">{medicine.strength}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Form:</span>
            <span className="font-medium text-gray-900">
              {medicine.dosage_form.replace('_', ' ').toLowerCase()}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Manufacturer:</span>
            <span className="font-medium text-gray-900 truncate ml-2">{medicine.manufacturer}</span>
          </div>
        </div>
        
        <div className="mt-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {medicine.category_name}
          </span>
        </div>
      </div>
      
      {/* Card Footer */}
      <div className="mt-auto p-4 pt-0">
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl font-bold text-blue-600">
            NPR {medicine.unit_price}
          </div>
          
          <div className="text-right">
            {medicine.available_stock > 0 && (
              <p className="text-xs text-gray-500 mb-1">Qty: {medicine.available_stock}</p>
            )}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              medicine.is_in_stock 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {medicine.is_in_stock ? "In Stock" : "Out of Stock"}
            </span>
          </div>
        </div>
        
        {userRole === 'PATIENT' && (
          <button 
            onClick={() => onAddToCart(medicine.id)}
            disabled={!medicine.is_in_stock}
            className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
              medicine.is_in_stock
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
};

// Main medicine list component
const MedicineList = ({ userRole = "PATIENT" }) => {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Filters and pagination
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dosageForm, setDosageForm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Fetch medicines
  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    setError(null);

    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (category) queryParams.append('category', category);
    if (dosageForm) queryParams.append('dosage_form', dosageForm);
    queryParams.append('page', page);
    queryParams.append('page_size', 12);

    try {
      const response = await apiClient.get(`/pharmacy/medicines/`, { params: queryParams });
      if (response.data && response.data.results) {
        setMedicines(response.data.results);
        setTotalPages(response.data.total_pages || Math.ceil(response.data.count / 12));
      } else {
        setMedicines([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching medicines:", err);
      setError(err.response?.data?.detail || "Failed to load medicines. Please try again.");
      setMedicines([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, category, dosageForm, page]);

  // Fetch categories for filter
  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.get('/pharmacy/categories/?limit=100');
      setCategories(response.data.results || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, []);

  // Add to cart function
  const handleAddToCart = async (medicineId) => {
    try {
      await apiClient.post('/pharmacy/cart/items/', {
        medicine: medicineId,
        quantity: 1
      });
      setSuccess('Item added to cart successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add item to cart');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Initial data fetch and re-fetch when filters/page change
  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMedicines();
  };
  
  // Pagination component
  const Pagination = () => {
    const pageNumbers = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return (
      <div className="flex items-center justify-center space-x-2">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        {pageNumbers.map((number) => (
          <button
            key={number}
            onClick={() => setPage(number)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              page === number
                ? 'text-white bg-blue-600 border border-blue-600'
                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {number}
          </button>
        ))}
        
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    );
  };
  
  return (
    <div>
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Browse Medicines</h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSearchSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Medicines
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, generic name..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Dosage Form */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dosage Form
              </label>
              <select
                value={dosageForm}
                onChange={(e) => setDosageForm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Forms</option>
                <option value="TABLET">Tablet</option>
                <option value="CAPSULE">Capsule</option>
                <option value="SYRUP">Syrup</option>
                <option value="INJECTION">Injection</option>
                <option value="CREAM">Cream</option>
                <option value="DROPS">Drops</option>
              </select>
            </div>
            
            {/* Filter Button */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actions
              </label>
              <button 
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
                <span>Filter</span>
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Success/Error messages */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6">
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4">
            {error}
          </div>
          <div className="text-center">
            <button 
              onClick={fetchMedicines}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Retry Loading Medicines
            </button>
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : medicines.length > 0 ? (
        <>
          {/* Results Count */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing {medicines.length} medicines on page {page} of {totalPages}
            </p>
          </div>
          
          {/* Medicine Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {medicines.map((medicine) => (
              <MedicineCard 
                key={medicine.id}
                medicine={medicine} 
                userRole={userRole} 
                onAddToCart={handleAddToCart} 
              />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No medicines found</h3>
          <p className="text-gray-600">No medicines found matching your criteria. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
};

export default MedicineList;