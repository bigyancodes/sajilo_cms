// src/components/ehr/AttachmentsSection.jsx
import React, { useState, useRef } from "react";
import { uploadAttachment, downloadAttachment } from "../../api/ehrService";

const fileTypeIcons = {
  LAB_REPORT: (
    <svg className="h-8 w-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  IMAGING: (
    <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  PRESCRIPTION: (
    <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  OTHER: (
    <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
};

const AttachmentItem = ({ attachment, onRefresh }) => {
  const [downloading, setDownloading] = useState(false);
  
  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      const response = await downloadAttachment(attachment.id);
      
      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.file_name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error("Failed to download attachment:", err);
      alert("Failed to download file. Please try again.");
    } finally {
      setDownloading(false);
    }
  };
  
  const getFileIcon = () => {
    return fileTypeIcons[attachment.file_type] || fileTypeIcons.OTHER;
  };
  
  // Get file extension from filename
  const getFileExtensionClass = () => {
    const extension = attachment.file_name.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'bg-red-100 text-red-800';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'bg-blue-100 text-blue-800';
      case 'doc':
      case 'docx':
        return 'bg-blue-100 text-blue-800';
      case 'xls':
      case 'xlsx':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="flex items-center p-3 border border-gray-200 rounded-md">
      <div className="flex-shrink-0 mr-4">
        {getFileIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {attachment.file_name}
        </p>
        <div className="flex items-center text-xs text-gray-500">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getFileExtensionClass()} mr-2`}>
            {attachment.file_name.split('.').pop().toUpperCase()}
          </span>
          <span>{attachment.file_type_display}</span>
          <span className="mx-2">•</span>
          <span>Uploaded by {attachment.uploaded_by_name}</span>
          <span className="mx-2">•</span>
          <span>{new Date(attachment.uploaded_at).toLocaleString()}</span>
        </div>
        {attachment.description && (
          <p className="mt-1 text-sm text-gray-600">{attachment.description}</p>
        )}
      </div>
      
      <div className="flex-shrink-0 ml-4">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {downloading ? (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          Download
        </button>
      </div>
    </div>
  );
};

const AttachmentsSection = ({ medicalRecordId, attachments = [], readOnly = true, onRefresh }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [description, setDescription] = useState("");
  const [fileType, setFileType] = useState("OTHER");
  
  const fileInputRef = useRef(null);
  
  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    const file = fileInputRef.current.files[0];
    if (!file) {
      setUploadError("Please select a file to upload");
      return;
    }
    
    if (!fileType) {
      setUploadError("Please select a file type");
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadError("");
      setUploadSuccess("");
      
      await uploadAttachment({
        file,
        medical_record: medicalRecordId,
        file_type: fileType,
        description
      });
      
      setUploadSuccess("File uploaded successfully");
      
      // Reset form
      fileInputRef.current.value = "";
      setDescription("");
      setFileType("OTHER");
      
      // Refresh the attachments list
      if (onRefresh) {
        onRefresh();
      }
      
    } catch (err) {
      console.error("Failed to upload attachment:", err);
      setUploadError(
        err.response?.data?.error || 
        "Failed to upload file. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-3">Attachments</h3>
      
      {/* Upload Form */}
      {!readOnly && (
        <form onSubmit={handleFileUpload} className="mb-6 p-4 bg-gray-50 rounded-md">
          {uploadError && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
              {uploadError}
            </div>
          )}
          
          {uploadSuccess && (
            <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700">
              {uploadSuccess}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                ref={fileInputRef}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="file_type" className="block text-sm font-medium text-gray-700 mb-1">
                File Type <span className="text-red-500">*</span>
              </label>
              <select
                id="file_type"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="LAB_REPORT">Lab Report</option>
                <option value="IMAGING">Imaging/Scan</option>
                <option value="PRESCRIPTION">Prescription</option>
                <option value="OTHER">Other Document</option>
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Description of the file (optional)"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUploading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isUploading ? (
                <span className="inline-flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload File
                </>
              )}
            </button>
          </div>
        </form>
      )}
      
      {/* Attachments List */}
      <div className="space-y-3">
        {attachments.length === 0 ? (
          <div className="bg-gray-50 p-4 rounded-md text-gray-500 italic">
            No attachments added
          </div>
        ) : (
          attachments.map((attachment) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              onRefresh={onRefresh}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AttachmentsSection;