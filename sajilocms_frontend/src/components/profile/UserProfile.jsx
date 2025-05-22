import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import userService from '../../api/userService';
import { toast } from 'react-hot-toast';

const UserProfile = () => {
  const { user, refreshUser } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle profile photo change
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo size should be less than 5MB');
      return;
    }

    // Check file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Only JPEG, JPG and PNG images are allowed');
      return;
    }

    try {
      setPhotoLoading(true);
      const result = await userService.updateProfilePhoto(file);
      
      if (result.success) {
        // Update localStorage directly
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        userData.profile_photo_url = result.data.profile_photo_url;
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // Refresh user data in the context
        await refreshUser();
        
        toast.success('Profile photo updated successfully');
      } else {
        toast.error(result.error || 'Failed to update profile photo');
      }
    } catch (error) {
      console.error('Error updating profile photo:', error);
      toast.error('An error occurred while updating your profile photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await userService.updateProfile(profileData);
      
      if (result.success) {
        // Immediately update the profile data in state
        setProfileData({
          first_name: result.data.first_name || profileData.first_name,
          last_name: result.data.last_name || profileData.last_name,
          email: result.data.email || profileData.email,
        });
        
        // Update localStorage directly
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const updatedUserData = {
          ...userData,
          ...result.data
        };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        
        // Refresh user data in the context
        await refreshUser();
        
        setIsEditing(false);
        toast.success('Profile updated successfully');
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('An error occurred while updating your profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex mb-6 items-start">
          {/* Profile Photo Section */}
          <div className="relative mr-6">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 border-2 border-blue-100 shadow mb-2">
              {user.profile_photo_url ? (
                <img 
                  src={user.profile_photo_url} 
                  alt={`${user.first_name}'s profile`} 
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-blue-50 text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <label 
              htmlFor="profile-photo-upload" 
              className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 cursor-pointer shadow hover:bg-blue-700 transition-colors"
            >
              {photoLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </label>
            <input 
              id="profile-photo-upload"
              type="file"
              accept="image/jpeg, image/png, image/jpg"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">{user.first_name} {user.last_name}</h3>
            <p className="text-sm text-gray-500 mb-2">{user.role}</p>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {user.is_verified ? 'Verified Account' : 'Pending Verification'}
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="md:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={profileData.email}
                onChange={handleChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full px-3 py-2 border ${isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              />
            </div>
            
            {/* First Name */}
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={profileData.first_name}
                onChange={handleChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full px-3 py-2 border ${isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              />
            </div>
            
            {/* Last Name */}
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={profileData.last_name}
                onChange={handleChange}
                readOnly={!isEditing}
                className={`mt-1 block w-full px-3 py-2 border ${isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              />
            </div>

            {/* Role Information (read-only) */}
            <div className="md:col-span-2">
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <input
                type="text"
                id="role"
                value={user.role}
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 focus:outline-none sm:text-sm"
              />
            </div>
            
            {/* Doctor-specific fields */}
            {user.role === 'DOCTOR' && user.doctor_profile && (
              <>
                <div>
                  <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">
                    Specialty
                  </label>
                  <input
                    type="text"
                    id="specialty"
                    value={user.doctor_profile.specialty || ''}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 focus:outline-none sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="license" className="block text-sm font-medium text-gray-700">
                    License Number
                  </label>
                  <input
                    type="text"
                    id="license"
                    value={user.doctor_profile.license_number || ''}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 focus:outline-none sm:text-sm"
                  />
                </div>
              </>
            )}
            
            {/* Account Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Account Status
              </label>
              <div className="mt-1 flex items-center">
                <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${user.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {user.is_verified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="md:col-span-2 flex justify-end space-x-3 pt-4 mt-2 border-t border-gray-100">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      // Reset form data to original user data
                      if (user) {
                        setProfileData({
                          first_name: user.first_name || '',
                          last_name: user.last_name || '',
                          email: user.email || '',
                        });
                      }
                    }}
                    className="px-3 py-1.5 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none flex items-center transition-colors"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfile; 