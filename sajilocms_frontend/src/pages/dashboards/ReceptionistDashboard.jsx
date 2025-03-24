// src/pages/dashboards/ReceptionistDashboard.jsx
import React from "react";
import DoctorList from "../../components/DoctorList";
import { Typography } from "@mui/material";

const ReceptionistDashboard = () => {
  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <Typography variant="h4" gutterBottom>
        Receptionist Dashboard
      </Typography>
      <DoctorList />
    </div>
  );
};

export default ReceptionistDashboard;