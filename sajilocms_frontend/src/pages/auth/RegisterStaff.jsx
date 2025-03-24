// src/components/RegisterStaff.jsx
import React, { useState } from "react";
import { TextField, Button, Typography, MenuItem } from "@mui/material";
import { registerStaff } from "../api/axiosInstance";

const RegisterStaff = ({ onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "",
    license_number: "",
    specialty: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await registerStaff(formData);
      setSuccess(response.data.message || "Staff registered successfully!");
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        role: "",
        license_number: "",
        specialty: "",
      });
      if (onRegisterSuccess) onRegisterSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to register staff.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <Typography variant="h5" gutterBottom>
        Register New Staff
      </Typography>
      {error && <Typography color="error">{error}</Typography>}
      {success && <Typography color="success.main">{success}</Typography>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <TextField
          label="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          type="email"
        />
        <TextField
          label="First Name"
          name="first_name"
          value={formData.first_name}
          onChange={handleChange}
          required
        />
        <TextField
          label="Last Name"
          name="last_name"
          value={formData.last_name}
          onChange={handleChange}
          required
        />
        <TextField
          select
          label="Role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          required
        >
          <MenuItem value="DOCTOR">Doctor</MenuItem>
          <MenuItem value="RECEPTIONIST">Receptionist</MenuItem>
          <MenuItem value="PHARMACIST">Pharmacist</MenuItem>
        </TextField>
        {formData.role === "DOCTOR" && (
          <>
            <TextField
              label="License Number"
              name="license_number"
              value={formData.license_number}
              onChange={handleChange}
              required
            />
            <TextField
              label="Specialty"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              required
            />
          </>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          style={{ marginTop: "10px" }}
        >
          {loading ? "Registering..." : "Register Staff"}
        </Button>
      </form>
    </div>
  );
};

export default RegisterStaff;