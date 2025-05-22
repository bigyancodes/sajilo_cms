// src/api/userService.js
import axiosInstance from './axiosInstance';

/**
 * User profile service for managing user profile data
 */
export const userService = {
  /**
   * Get the current user's profile
   * @returns {Promise} Promise with user profile data
   */
  getProfile: async () => {
    try {
      const response = await axiosInstance.get('/profile/');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch profile'
      };
    }
  },

  /**
   * Update the user's profile information
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} Promise with updated user data
   */
  updateProfile: async (profileData) => {
    try {
      const response = await axiosInstance.put('/profile/', profileData);
      return {
        success: true,
        data: response.data,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update profile'
      };
    }
  },

  /**
   * Upload a new profile photo
   * @param {File} photoFile - The photo file to upload
   * @returns {Promise} Promise with the new photo URL
   */
  updateProfilePhoto: async (photoFile) => {
    try {
      const formData = new FormData();
      formData.append('profile_photo', photoFile);

      const response = await axiosInstance.post('/profile/photo/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return {
        success: true,
        data: response.data,
        message: 'Profile photo updated successfully'
      };
    } catch (error) {
      console.error('Error updating profile photo:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update profile photo'
      };
    }
  }
};

export default userService; 