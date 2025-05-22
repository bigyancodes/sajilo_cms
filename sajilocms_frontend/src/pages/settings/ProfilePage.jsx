import React from 'react';
import UserProfile from '../../components/profile/UserProfile';

const ProfilePage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h1>
        <UserProfile />
      </div>
    </div>
  );
};

export default ProfilePage;
