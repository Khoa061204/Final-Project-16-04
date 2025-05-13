import React, { createContext, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Home from "./Pages/Home.js";
import UploadFile from "./Pages/UploadFile";
import ForgotPassword from "./Pages/ForgotPassword";
import ResetPassword from "./Pages/ResetPassword";
import TextEditor from "./Pages/TextEditor";
import { isAuthenticated, verifyToken, isRememberMeEnabled } from "./utils/auth";

// Create Authentication Context
export const AuthContext = createContext({
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  user: null,
  setUser: () => {},
  rememberMe: false,
  setRememberMe: () => {},
  loading: true
});

function App() {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    rememberMe: false,
    loading: true
  });

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        try {
          const { valid, user, rememberMe } = await verifyToken();
          setAuthState({
            isAuthenticated: valid,
            user: user,
            rememberMe: rememberMe || false,
            loading: false
          });
        } catch (error) {
          console.error("Error verifying token:", error);
          setAuthState({
            isAuthenticated: false,
            user: null,
            rememberMe: false,
            loading: false
          });
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          rememberMe: false,
          loading: false
        });
      }
    };

    checkAuth();
  }, []);

  // Show loading state while checking authentication
  if (authState.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider 
      value={{
        isAuthenticated: authState.isAuthenticated,
        setIsAuthenticated: (value) => setAuthState(prev => ({ ...prev, isAuthenticated: value })),
        user: authState.user,
        setUser: (user) => setAuthState(prev => ({ ...prev, user })),
        rememberMe: authState.rememberMe,
        setRememberMe: (value) => setAuthState(prev => ({ ...prev, rememberMe: value })),
        loading: authState.loading
      }}
    >
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={authState.isAuthenticated ? <Navigate to="/" /> : <Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route path="/" element={authState.isAuthenticated ? <Home /> : <Navigate to="/login" />} />
          <Route path="/home" element={authState.isAuthenticated ? <Home /> : <Navigate to="/login" />} />
          <Route path="/upload" element={authState.isAuthenticated ? <UploadFile /> : <Navigate to="/login" />} />
          <Route path="/documents/:id" element={authState.isAuthenticated ? <TextEditor /> : <Navigate to="/login" />} />
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to={authState.isAuthenticated ? "/" : "/login"} />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
