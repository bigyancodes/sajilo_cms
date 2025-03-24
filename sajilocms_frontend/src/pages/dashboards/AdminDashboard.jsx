// src/pages/dashboards/AdminDashboard.jsx
import React, { useState } from "react";
import RegisterStaff from "../../components/RegisterStaff";
import UserList from "../../components/UserList";
import { verifyStaff } from "../../api/axiosInstance";
import { Typography } from "@mui/material";

const AdminDashboard = () => {
  const [refresh, setRefresh] = useState(false);

  const handleVerify = async (staffId) => {
    try {
      await verifyStaff(staffId);
      setRefresh(!refresh);
      alert("Staff verified successfully!");
    } catch (err) {
      alert("Failed to verify staff: " + (err.response?.data?.error || "Unknown error"));
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      <RegisterStaff onRegisterSuccess={() => setRefresh(!refresh)} />

      <UserList onVerify={handleVerify} refresh={refresh} />
    </div>
  );
};

export default AdminDashboard;