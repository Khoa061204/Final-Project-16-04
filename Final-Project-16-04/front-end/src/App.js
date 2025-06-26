import React, { createContext, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Home from "./Pages/Home.js";
import UploadFile from "./Pages/UploadFile";
import ForgotPassword from "./Pages/ForgotPassword";
import ResetPassword from "./Pages/ResetPassword";
import TextEditor from "./Pages/TextEditor";
import Teams from './Pages/Teams';
import { isAuthenticated, verifyToken, isRememberMeEnabled, getToken, setTokenWithExpiry } from "./utils/auth";
import Sidebar from './components/Sidebar';
import MainLayout from "./components/MainLayout";
import TeamChat from "./components/TeamChat";
import ProjectsPage from "./Pages/ProjectsPage";
import ProjectDetailPage from "./Pages/ProjectDetailPage";
import CalendarPage from "./Pages/CalendarPage";

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
  const [teams, setTeams] = useState([]);

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

  useEffect(() => {
    const fetchTeams = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    };
    fetchTeams();
  }, [authState.isAuthenticated]);

  // Token refresh logic
  useEffect(() => {
    let interval;
    async function refreshAuthToken() {
      try {
        const token = getToken();
        if (!token) return;
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/refresh-token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            setTokenWithExpiry(data.token);
          }
        }
      } catch (err) {
        // Optionally handle refresh error
      }
    }
    if (authState.isAuthenticated) {
      // Refresh every 25 minutes (token expires in 1h)
      interval = setInterval(refreshAuthToken, 25 * 60 * 1000);
    }
    return () => clearInterval(interval);
  }, [authState.isAuthenticated]);

  // Show loading state while checking authentication
  if (authState.loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-4 text-gray-600 animate-pulse">Loading your workspace...</p>
        </div>
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
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route
            path="/"
            element={
              authState.isAuthenticated ? (
                <MainLayout teams={teams}>
                  <Home />
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/home"
            element={
              authState.isAuthenticated ? (
                <MainLayout teams={teams}>
                  <Home />
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/folders/:folderId"
            element={
              authState.isAuthenticated ? (
                <MainLayout teams={teams}>
                  <Home />
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/upload"
            element={
              authState.isAuthenticated ? (
                <MainLayout teams={teams}>
                  <UploadFile />
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/projects"
            element={
              authState.isAuthenticated ? (
                <MainLayout teams={teams}>
                  <ProjectsPage />
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              authState.isAuthenticated ? (
                <MainLayout teams={teams}>
                  <ProjectDetailPage />
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/calendar"
            element={
              authState.isAuthenticated ? (
                <MainLayout teams={teams}>
                  <CalendarPage />
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/documents/:id"
            element={
              authState.isAuthenticated ? (
                <MainLayout teams={teams}>
                  <TextEditor />
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/teams"
            element={
              authState.isAuthenticated ? (
                <MainLayout teams={teams}>
                  <Teams teams={teams} setTeams={setTeams} />
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/chat"
            element={
              authState.isAuthenticated ? (
                <MainLayout teams={teams}>
                  <TeamChat user={authState.user} teams={teams} />
                </MainLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to={authState.isAuthenticated ? "/" : "/login"} />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
