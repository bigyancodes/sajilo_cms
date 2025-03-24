// src/components/RegisterStaff.jsx
import React, { useState, useContext } from "react";
import {
  Button,
  TextField,
  Select,
  MenuItem,
  Typography,
  Paper,
  FormControl,
  InputLabel,
} from "@mui/material";
import axiosInstance from "../api/axiosInstance";
import { AuthContext } from "../context/AuthContext";

const RegisterStaff = ({ onRegisterSuccess }) => {
  const [staffData, setStaffData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "",
    password: "",
    license_number: "",
    specialty: "",
  });

  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  if (!user || user.role !== "ADMIN") {
    return (
      <Typography color="error">
        Unauthorized: Only admins can register staff.
      </Typography>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStaffData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setStaffData((prev) => ({
      ...prev,
      role: selectedRole,
      license_number: selectedRole === "DOCTOR" ? prev.license_number : "",
      specialty: selectedRole === "DOCTOR" ? prev.specialty : "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { ...staffData };
      if (staffData.role !== "DOCTOR") {
        delete payload.license_number;
        delete payload.specialty;
      }

      await axiosInstance.post("/admin/register-staff/", payload);
      alert("Staff registered successfully!");
      setStaffData({
        email: "",
        first_name: "",
        last_name: "",
        role: "",
        password: "",
        license_number: "",
        specialty: "",
      });
      onRegisterSuccess();
    } catch (error) {
      console.error("Registration error:", error);
      alert(
        error.response?.data?.error || "Registration failed. Check console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} style={{ padding: "20px", marginBottom: "20px" }}>
      <Typography variant="h6">Register New Staff</Typography>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px" }}
      >
        <TextField
          name="first_name"
          label="First Name"
          value={staffData.first_name}
          onChange={handleChange}
          required
          fullWidth
        />
        <TextField
          name="last_name"
          label="Last Name"
          value={staffData.last_name}
          onChange={handleChange}
          required
          fullWidth
        />
        <TextField
          name="email"
          label="Email"
          type="email"
          value={staffData.email}
          onChange={handleChange}
          required
          fullWidth
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          value={staffData.password}
          onChange={handleChange}
          required
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>Role *</InputLabel>
          <Select
            name="role"
            value={staffData.role}
            onChange={handleRoleChange}
            label="Role"
            required
          >
            <MenuItem value="DOCTOR">Doctor</MenuItem>
            <MenuItem value="RECEPTIONIST">Receptionist</MenuItem>
            <MenuItem value="PHARMACIST">Pharmacist</MenuItem>
          </Select>
        </FormControl>
        {staffData.role === "DOCTOR" && (
          <>
            <TextField
              name="license_number"
              label="License Number"
              value={staffData.license_number}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              name="specialty"
              label="Specialty"
              value={staffData.specialty}
              onChange={handleChange}
              required
              fullWidth
            />
          </>
        )}
        <Button
          variant="contained"
          color="primary"
          type="submit"
          disabled={loading}
          fullWidth
        >
          {loading ? "Registering..." : "Register Staff"}
        </Button>
      </form>
    </Paper>
  );
};

export default RegisterStaff;