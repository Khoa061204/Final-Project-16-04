import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Home from "./Pages/Home.js";
import UploadFile from "./Pages/UploadFile";
import ForgotPassword from "./Pages/ForgotPassword";



function App() {
  const isAuthenticated = localStorage.getItem("authToken");

  return (
    <Router>
      <Routes>
        {/* Always start on Login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Authenticated users go to Home */}
        <Route path="/home" element={isAuthenticated ? <Home /> : <Navigate to="/login" />} />

        {/* Other routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/upload" element={isAuthenticated ? <UploadFile /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
