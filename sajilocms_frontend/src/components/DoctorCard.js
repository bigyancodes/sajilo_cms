// src/components/DoctorCard.js
import React from "react";

const DoctorCard = ({ doctor }) => {
  return (
    <div style={styles.card}>
      <h3>{doctor.full_name || doctor.email}</h3>
      <p><strong>Specialty:</strong> {doctor.specialty || "N/A"}</p>
      <p><strong>License:</strong> {doctor.license_number || "N/A"}</p>
    </div>
  );
};

const styles = {
  card: {
    border: "1px solid #ccc",
    padding: "15px",
    borderRadius: "5px",
    textAlign: "center",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },
};

export default DoctorCard;