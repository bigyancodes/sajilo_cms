// src/components/UserList.jsx - Fixed useEffect dependency warning
import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import UserEditModal from "./UserEditModal";

const UserList = ({ onVerify, refresh }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("DOCTOR");
  const [searchQuery, setSearchQuery] = useState("");

  const roleTabs = [
    { role: "DOCTOR", label: "Doctors" },
    { role: "PATIENT", label: "Patients" },
    { role: "RECEPTIONIST", label: "Receptionists" },
    { role: "PHARMACIST", label: "Pharmacists" },
  ];

  // Filter users by the activeTab and search query
  const filteredUsers = users.filter((user) => {
    const matchesRole = user.role === activeTab;
    const lowerSearch = searchQuery.toLowerCase();

    const matchesSearch =
      user.email.toLowerCase().includes(lowerSearch) ||
      (user.first_name &&
        user.first_name.toLowerCase().includes(lowerSearch)) ||
      (user.last_name &&
        user.last_name.toLowerCase().includes(lowerSearch));

    return matchesRole && matchesSearch;
  });

  // Normalize a user object to ensure license_number & specialty are always present
  const normalizeUserData = (rawUser) => {
    return {
      ...rawUser,
      license_number: rawUser.license_number || "",
      specialty: rawUser.specialty || "",
    };
  };

  // Fetch the full user list (admin endpoint) - using useCallback to memoize
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.get("admin/users/");
      const userData = response.data.results || response.data;
      const normalizedUsers = Array.isArray(userData)
        ? userData.map(normalizeUserData)
        : [];
      setUsers(normalizedUsers);
    } catch (err) {
      setError("Failed to load users. Please try again later.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed since this doesn't depend on props or state

  // Open edit modal for a specific user
  const handleEdit = (user) => {
    setSelectedUser({
      ...user,
      license_number: user.license_number || "",
      specialty: user.specialty || "",
    });
    setShowEditModal(true);
  };

  // Helper to parse and display server validation errors
  const displayServerErrors = (data) => {
    let errorMsg = "Update failed due to validation error(s):\n";
    if (typeof data === "string") {
      errorMsg += data;
      alert(errorMsg);
      return;
    }

    if (typeof data === "object" && data !== null) {
      for (const [field, messages] of Object.entries(data)) {
        if (Array.isArray(messages)) {
          errorMsg += `\n- ${field}: ${messages.join(", ")}`;
        } else if (typeof messages === "object" && messages !== null) {
          for (const [subField, subMsg] of Object.entries(messages)) {
            if (Array.isArray(subMsg)) {
              errorMsg += `\n- ${field}.${subField}: ${subMsg.join(", ")}`;
            } else {
              errorMsg += `\n- ${field}.${subField}: ${subMsg}`;
            }
          }
        } else {
          errorMsg += `\n- ${field}: ${messages}`;
        }
      }
      alert(errorMsg);
    } else {
      alert("Unknown error format. Check console for details.");
      console.error("Unhandled error structure:", data);
    }
  };

  // Update user via PUT request to `admin/users/:id/`
  const handleUpdateUser = async (updatedData) => {
    try {
      const payload = {
        first_name: updatedData.first_name,
        last_name: updatedData.last_name,
        role: updatedData.role,
        is_verified: updatedData.is_verified,
      };

      if (updatedData.role === "DOCTOR") {
        payload.license_number = updatedData.license_number;
        payload.specialty = updatedData.specialty;
      }

      const response = await axiosInstance.put(
        `admin/users/${updatedData.id}/`,
        payload
      );

      const updatedUser = normalizeUserData(response.data);
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );

      setShowEditModal(false);
    } catch (err) {
      console.error("Update error:", err.response?.data);
      if (err.response?.data) {
        displayServerErrors(err.response.data);
      } else {
        alert("Update failed: Unknown error. Check console for details.");
      }
    }
  };

  // Re-fetch users when `refresh` changes - now with fetchUsers in the dependency array
  useEffect(() => {
    fetchUsers();
  }, [refresh, fetchUsers]); // Added fetchUsers as a dependency

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h3 className="text-2xl font-semibold text-gray-800">User Management</h3>
        <input
          type="text"
          placeholder="Search users..."
          className="w-full md:w-64 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4">
          {roleTabs.map((tab) => (
            <button
              key={tab.role}
              onClick={() => setActiveTab(tab.role)}
              className={`pb-3 px-1 ${
                activeTab === tab.role
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              } font-medium`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              {activeTab === "DOCTOR" && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specialty
                  </th>
                </>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={activeTab === "DOCTOR" ? 6 : 4}
                  className="px-6 py-4 text-center text-gray-500"
                >
                  No {activeTab.toLowerCase()}s found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.first_name} {user.last_name}
                  </td>
                  {activeTab === "DOCTOR" && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.license_number || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.specialty || "-"}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.is_verified
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {user.is_verified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    {user.role !== "PATIENT" && !user.is_verified && (
                      <button
                        onClick={() => onVerify(user.id)}
                        className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showEditModal && (
        <UserEditModal
          user={selectedUser}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdateUser}
        />
      )}
    </div>
  );
};

export default UserList;