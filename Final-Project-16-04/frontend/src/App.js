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
import TeamDetail from './Pages/TeamDetail';
import Notifications from './Pages/Notifications';
import ProfileSettings from './Pages/ProfileSettings';

import { isAuthenticated, verifyToken, isRememberMeEnabled, getToken, setTokenWithExpiry } from "./utils/auth";
import Sidebar from './components/Sidebar';
import MainLayout from "./components/MainLayout";
import TeamChat from "./components/TeamChat";
import ProjectsPage from "./Pages/ProjectsPage";
import ProjectDetailPage from "./Pages/ProjectDetailPage";
import CalendarPage from "./Pages/CalendarPage";
import MyTasksPage from './Pages/MyTasksPage';
import Settings from './Pages/Settings';
import { ThemeProvider } from './contexts/ThemeContext';
import Logo from './components/Logo';
import { getApiUrl } from './config/api';

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
      if (!token || !authState.isAuthenticated) return;
      
      try {
        const response = await fetch(getApiUrl('/teams'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Combine created, member, and public teams
            const allTeams = [
              ...(data.data.created || []),
              ...(data.data.member || []),
              ...(data.data.public || [])
            ];
            setTeams(allTeams);
          } else {
            setTeams([]);
          }
        } else {
          console.warn('Failed to fetch teams for chat');
          setTeams([]);
        }
      } catch (error) {
        console.error('Error fetching teams for chat:', error);
        setTeams([]);
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
        if (token && authState.isAuthenticated) {
          const response = await fetch(getApiUrl('/auth/refresh'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setTokenWithExpiry(data.token, authState.rememberMe);
          } else {
            // Token refresh failed, logout user
            localStorage.removeItem('token');
            setAuthState({
              isAuthenticated: false,
              user: null,
              rememberMe: false,
              loading: false
            });
          }
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
    }

    if (authState.isAuthenticated && authState.rememberMe) {
      // Refresh token every 14 minutes (tokens expire in 15 minutes)
      interval = setInterval(refreshAuthToken, 14 * 60 * 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [authState.isAuthenticated, authState.rememberMe]);

  // Loading screen
  if (authState.loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Logo size={80} variant="default" />
            <div className="mt-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your workspace...</p>
            </div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AuthContext.Provider value={{
        isAuthenticated: authState.isAuthenticated,
        setIsAuthenticated: (value) => setAuthState(prev => ({ ...prev, isAuthenticated: value })),
        user: authState.user,
        setUser: (user) => setAuthState(prev => ({ ...prev, user })),
        rememberMe: authState.rememberMe,
        setRememberMe: (value) => setAuthState(prev => ({ ...prev, rememberMe: value })),
        loading: authState.loading
      }}>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/login" 
                element={
                  authState.isAuthenticated ? 
                  <Navigate to="/" replace /> : 
                  <Login />
                } 
              />
              <Route 
                path="/register" 
                element={
                  authState.isAuthenticated ? 
                  <Navigate to="/" replace /> : 
                  <Register />
                } 
              />
              <Route 
                path="/forgot-password" 
                element={
                  authState.isAuthenticated ? 
                  <Navigate to="/" replace /> : 
                  <ForgotPassword />
                } 
              />
              <Route 
                path="/reset-password" 
                element={
                  authState.isAuthenticated ? 
                  <Navigate to="/" replace /> : 
                  <ResetPassword />
                } 
              />

              {/* Protected Routes */}
              <Route 
                path="/" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <Home />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/upload" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <UploadFile />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/editor/:id" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <TextEditor />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/documents/:id" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <TextEditor />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/teams" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <Teams teams={teams} setTeams={setTeams} />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/teams/:teamId" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <TeamDetail />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/chat" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <TeamChat teams={teams} user={authState.user} />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/notifications" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <Notifications />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/projects" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <ProjectsPage />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/projects/:id" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <ProjectDetailPage />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/calendar" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <CalendarPage />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/my-tasks" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <MyTasksPage />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />

              <Route 
                path="/settings" 
                element={
                  authState.isAuthenticated ? 
                  <MainLayout>
                    <Settings />
                  </MainLayout> : 
                  <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/profile" 
                element={
                  authState.isAuthenticated ? 
                  <ProfileSettings /> : 
                  <Navigate to="/login" replace />
                } 
              />

              {/* Catch all route */}
              <Route 
                path="*" 
                element={
                  authState.isAuthenticated ? 
                  <Navigate to="/" replace /> : 
                  <Navigate to="/login" replace />
                } 
              />
            </Routes>
          </div>
        </Router>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

export default App;
