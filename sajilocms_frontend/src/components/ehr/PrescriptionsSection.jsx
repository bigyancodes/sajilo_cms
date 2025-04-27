// src/components/ehr/PrescriptionsSection.jsx
import React, { useState } from "react";

const PrescriptionItem = ({ prescription, onRemove, readOnly }) => {
  return (
    <div className="bg-blue-50 p-4 rounded-md mb-3 border border-blue-100">
      <div className="flex justify-between items-start">
        <div className="font-medium text-blue-900">{prescription.medication}</div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onRemove(prescription)}
            className="text-red-600 hover:text-red-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-blue-800">
        <div>
          <span className="text-blue-500">Dosage:</span> {prescription.dosage}
        </div>
        <div>
          <span className="text-blue-500">Frequency:</span> {prescription.frequency}
        </div>
        <div>
          <span className="text-blue-500">Duration:</span> {prescription.duration}
        </div>
      </div>
      {prescription.instructions && (
        <div className="mt-2 text-sm">
          <span className="text-blue-500">Instructions:</span> {prescription.instructions}
        </div>
      )}
    </div>
  );
};

const DEFAULT_PRESCRIPTION = {
  medication: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: ""
};

const PrescriptionsSection = ({ prescriptions = [], onChange, readOnly = true }) => {
  const [newPrescription, setNewPrescription] = useState({ ...DEFAULT_PRESCRIPTION });
  const [isAdding, setIsAdding] = useState(false);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPrescription(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddPrescription = () => {
    // Validate required fields
    if (!newPrescription.medication || !newPrescription.dosage || 
        !newPrescription.frequency || !newPrescription.duration) {
      alert("Please fill all required fields");
      return;
    }
    
    // Add the new prescription to the list
    const updatedPrescriptions = [...prescriptions, { ...newPrescription }];
    onChange(updatedPrescriptions);
    
    // Reset form and hide it
    setNewPrescription({ ...DEFAULT_PRESCRIPTION });
    setIsAdding(false);
  };
  
  const handleRemovePrescription = (prescriptionToRemove) => {
    const updatedPrescriptions = prescriptions.filter(
      p => p !== prescriptionToRemove
    );
    onChange(updatedPrescriptions);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-gray-900">Prescriptions</h3>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Prescription
          </button>
        )}
      </div>
      
      {/* New Prescription Form */}
      {!readOnly && isAdding && (
        <div className="bg-white border border-gray-200 p-4 rounded-md mb-4">
          <h4 className="font-medium text-gray-800 mb-3">New Prescription</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="medication" className="block text-sm font-medium text-gray-700 mb-1">
                Medication <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="medication"
                name="medication"
                value={newPrescription.medication}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Medication name"
                required
              />
            </div>
            
            <div>
              <label htmlFor="dosage" className="block text-sm font-medium text-gray-700 mb-1">
                Dosage <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="dosage"
                name="dosage"
                value={newPrescription.dosage}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 500mg"
                required
              />
            </div>
            
            <div>
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">
                Frequency <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="frequency"
                name="frequency"
                value={newPrescription.frequency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Twice daily"
                required
              />
            </div>
            
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duration <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="duration"
                name="duration"
                value={newPrescription.duration}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 7 days"
                required
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
              Instructions
            </label>
            <textarea
              id="instructions"
              name="instructions"
              value={newPrescription.instructions}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional instructions"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewPrescription({ ...DEFAULT_PRESCRIPTION });
              }}
              className="px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleAddPrescription}
              className="px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Prescription
            </button>
          </div>
        </div>
      )}
      
      {/* Prescriptions List */}
      <div>
        {prescriptions.length === 0 ? (
          <div className="bg-gray-50 p-4 rounded-md text-gray-500 italic">
            No prescriptions added
          </div>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((prescription, index) => (
              <PrescriptionItem
                key={index}
                prescription={prescription}
                onRemove={handleRemovePrescription}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrescriptionsSection;