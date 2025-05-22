import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import userService from '../../api/userService';
import { toast } from 'react-hot-toast';

const UserProfile = () => {
  const { user, setUser } = useContext(AuthContext);
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
        // Update the user context with new photo URL
        setUser(prev => ({
          ...prev,
          profile_photo_url: result.data.profile_photo_url
        }));
        
        // Update localStorage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        userData.profile_photo_url = result.data.profile_photo_url;
        localStorage.setItem('userData', JSON.stringify(userData));
        
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
        // Update user context
        setUser(prev => ({
          ...prev,
          ...result.data
        }));
        
        // Update localStorage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        localStorage.setItem('userData', JSON.stringify({
          ...userData,
          ...result.data
        }));
        
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
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">User Profile</h2>
      </div>
      
      <div className="p-6">
        {/* Profile Photo Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="h-32 w-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg mb-2">
              {user.profile_photo_url ? (
                <img 
                  src={user.profile_photo_url} 
                  alt={`${user.first_name}'s profile`} 
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <label 
              htmlFor="profile-photo-upload" 
              className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer shadow-lg hover:bg-blue-700 transition-colors"
            >
              {photoLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </label>
            <input 
              type="file" 
              id="profile-photo-upload" 
              className="hidden" 
              accept="image/png, image/jpeg, image/jpg"
              onChange={handlePhotoChange}
              disabled={photoLoading}
            />
          </div>
          <h3 className="text-xl font-semibold mt-2">{user.first_name} {user.last_name}</h3>
          <p className="text-gray-600">{user.role}</p>
        </div>

        {/* Profile Information */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={profileData.email}
                readOnly
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 focus:outline-none sm:text-sm"
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
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
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
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
              />
            </div>

            {/* Role Information (read-only) */}
            <div>
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
            <div className="flex justify-end space-x-3 pt-4">
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
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none flex items-center"
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
                  className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
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