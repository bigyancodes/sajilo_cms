// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Global styles (if any)
import { ThemeProvider, createTheme } from "@mui/material/styles";

// Create a custom MUI theme (optional, for consistent styling)
const theme = createTheme({
  palette: {
    primary: {
      main: "#007bff", // Matches the blue used in your inline styles
    },
    success: {
      main: "#28a745", // Green for success messages
    },
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
  },
});

// Render the app
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);