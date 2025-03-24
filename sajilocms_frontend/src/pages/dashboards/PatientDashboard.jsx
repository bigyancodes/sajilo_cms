// src/pages/dashboards/PatientDashboard.jsx
import React, { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { Typography } from "@mui/material";

const PatientDashboard = () => {
  const { user } = useContext(AuthContext);

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <Typography variant="h4" gutterBottom>
        Patient Dashboard
      </Typography>
      <Typography variant="h6">
        Welcome, {user.first_name} {user.last_name}
      </Typography>
      <Typography variant="body1">
        View doctors and their specialties from the "View Doctors" link in the navbar.
      </Typography>
    </div>
  );
};

export default PatientDashboard;