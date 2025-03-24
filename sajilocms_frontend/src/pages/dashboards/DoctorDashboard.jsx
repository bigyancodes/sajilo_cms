// src/pages/dashboards/DoctorDashboard.jsx
import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { fetchAllDoctors } from "../../api/axiosInstance";
import DoctorCard from "../../components/DoctorCard";
import { Typography } from "@mui/material";

const DoctorDashboard = () => {
  const { user } = useContext(AuthContext);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const response = await fetchAllDoctors();
        setDoctors(response.data);
      } catch (err) {
        console.error("Failed to load doctors:", err);
      }
    };
    loadDoctors();
  }, []);

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <Typography variant="h4" gutterBottom>
        Doctor Dashboard
      </Typography>
      <Typography variant="h6">
        Welcome, Dr. {user.first_name} {user.last_name}
      </Typography>
      <Typography variant="body1">
        Specialty: {user.doctor_profile?.specialty || "N/A"}
      </Typography>
      <Typography variant="body1">
        License: {user.doctor_profile?.license_number || "N/A"}
      </Typography>

      <Typography variant="h6" style={{ marginTop: "20px" }}>
        Other Doctors
      </Typography>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
        {doctors
          .filter((doc) => doc.id !== user.id)
          .map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
      </div>
    </div>
  );
};

export default DoctorDashboard;