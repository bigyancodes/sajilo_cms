// src/components/ehr/MedicalRecordForm.jsx
import React, { useState, useEffect } from "react";
import { 
  createMedicalRecord, 
  updateMedicalRecord, 
  fetchPatientMedicalHistory
} from "../../api/ehrService";
import PrescriptionsSection from "./PrescriptionsSection";

const MedicalRecordForm = ({ 
  record, 
  appointmentId, 
  patientId, 
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    appointment: appointmentId || (record?.appointment?.id || record?.appointment),
    chief_complaint: record?.chief_complaint || "",
    observations: record?.observations || "",
    diagnosis: record?.diagnosis || "",
    treatment_plan: record?.treatment_plan || "",
    notes: record?.notes || "",
    prescriptions: record?.prescriptions || [],
    previous_record_id: record?.previous_record?.id || record?.previous_record || null
  });
  
  const [previousRecords, setPreviousRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Log initialization outside useEffect to avoid dependency on appointmentId
  console.log("Form initialized with:", { record, appointmentId, patientId });

  useEffect(() => {
    const loadPreviousRecords = async () => {
      const effectivePatientId = patientId || record?.patient_id;
      if (!effectivePatientId) {
        console.warn("No patientId available for fetching previous records");
        return;
      }
      try {
        setFetchingHistory(true);
        const response = await fetchPatientMedicalHistory(effectivePatientId);
        const filteredRecords = record?.id 
          ? response.data.filter(r => r.id !== record.id) 
          : response.data;
        setPreviousRecords(filteredRecords);
      } catch (err) {
        console.error("Failed to load patient history:", err);
        setError("Failed to load previous records. Follow-up linking may be unavailable.");
      } finally {
        setFetchingHistory(false);
      }
    };
    loadPreviousRecords();
  }, [record, patientId]); // Dependencies are complete and accurate

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePrescriptionsChange = (prescriptions) => {
    setFormData(prev => ({ ...prev, prescriptions }));
  };

  const handlePreviousRecordChange = (e) => {
    const selectedRecordId = e.target.value;
    setFormData(prev => ({
      ...prev,
      previous_record_id: selectedRecordId === "none" ? null : selectedRecordId
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      console.log("Submitting formData:", formData);
      let response;
      if (record?.id) {
        response = await updateMedicalRecord(record.id, formData);
        setSuccess("Medical record updated successfully");
      } else {
        response = await createMedicalRecord(formData);
        setSuccess("Medical record created successfully");
      }
      onSave(response.data);
    } catch (err) {
      console.error("Failed to save medical record:", err);
      console.log("Error response:", err.response?.data);
      setError(err.response?.data?.error || err.response?.data?.appointment || "Failed to save the medical record. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <h2 className="text-xl font-bold">
          {record?.id ? "Edit Medical Record" : "New Medical Record"}
        </h2>
        {record && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-blue-200">Patient</p>
              <p className="font-medium">{record.patient_name}</p>
            </div>
            <div>
              <p className="text-blue-200">Doctor</p>
              <p className="font-medium">{record.doctor_name}</p>
            </div>
            <div>
              <p className="text-blue-200">Date</p>
              <p className="font-medium">{new Date(record.appointment_time).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
            {success}
          </div>
        )}
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Link as Follow-up Visit (Optional)
          </label>
          {fetchingHistory ? (
            <div className="flex items-center text-gray-500">
              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading previous visits...
            </div>
          ) : previousRecords.length === 0 ? (
            <p className="text-gray-500 italic">No previous visits found for this patient.</p>
          ) : (
            <>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.previous_record_id || "none"}
                onChange={handlePreviousRecordChange}
              >
                <option value="none">Not a follow-up visit</option>
                {previousRecords.map(prevRecord => (
                  <option key={prevRecord.id} value={prevRecord.id}>
                    Visit on {new Date(prevRecord.appointment_time).toLocaleDateString()} - {prevRecord.doctor_name} 
                    {prevRecord.diagnosis ? ` - ${prevRecord.diagnosis.substring(0, 30)}${prevRecord.diagnosis.length > 30 ? '...' : ''}` : ''}
                  </option>
                ))}
              </select>
              {formData.previous_record_id && previousRecords.find(r => r.id === formData.previous_record_id) && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-100">
                  <p className="text-sm text-blue-800 font-medium">Selected Previous Visit:</p>
                  <div className="mt-1 text-sm text-blue-700">
                    {(() => {
                      const prev = previousRecords.find(r => r.id === formData.previous_record_id);
                      return (
                        <>
                          <p><span className="font-medium">Date:</span> {new Date(prev.appointment_time).toLocaleString()}</p>
                          <p><span className="font-medium">Doctor:</span> {prev.doctor_name}</p>
                          {prev.diagnosis && <p><span className="font-medium">Diagnosis:</span> {prev.diagnosis}</p>}
                          {prev.treatment_plan && <p><span className="font-medium">Treatment:</span> {prev.treatment_plan}</p>}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="mb-6">
          <label htmlFor="chief_complaint" className="block text-sm font-medium text-gray-700 mb-2">
            Chief Complaint
          </label>
          <textarea
            id="chief_complaint"
            name="chief_complaint"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter the patient's chief complaint"
            value={formData.chief_complaint}
            onChange={handleChange}
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-2">
            Observations
          </label>
          <textarea
            id="observations"
            name="observations"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your observations"
            value={formData.observations}
            onChange={handleChange}
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-2">
            Diagnosis
          </label>
          <textarea
            id="diagnosis"
            name="diagnosis"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your diagnosis"
            value={formData.diagnosis}
            onChange={handleChange}
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="treatment_plan" className="block text-sm font-medium text-gray-700 mb-2">
            Treatment Plan
          </label>
          <textarea
            id="treatment_plan"
            name="treatment_plan"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter the treatment plan"
            value={formData.treatment_plan}
            onChange={handleChange}
          />
        </div>
        
        <div className="mb-6">
          <PrescriptionsSection
            prescriptions={formData.prescriptions}
            onChange={handlePrescriptionsChange}
            readOnly={false}
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter any additional notes"
            value={formData.notes}
            onChange={handleChange}
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              "Save Record"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MedicalRecordForm;     