import React, { useState, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders, handleLogout } from '../utils/auth';
import { AuthContext } from "../App";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import FolderCard from "../components/FolderCard";
import ActionCard from "../components/ActionCard";
import Tabs from "../components/Tabs";

// API endpoints
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const DOCUMENTS_ENDPOINT = `${API_BASE_URL}/documents`;

// Action items configuration
const ACTION_ITEMS = [
  { 
    id: 'new-doc',
    title: "New document", 
    color: "violet", 
    icon: "📄"
  },
  { 
    id: 'upload',
    title: "Upload file", 
    color: "blue", 
    icon: "⬆️"
  },
  { 
    id: 'new-team',
    title: "New team", 
    color: "green", 
    icon: "👥"
  }
];

// Folder items configuration
const FOLDER_ITEMS = [
  { id: '1', title: "3D renders", size: "92 MB", items: "18 images" },
  { id: '2', title: "Team photos", size: "188 MB", items: "32 images" },
  { id: '3', title: "UI presentations", size: "286 MB", items: "6 files" }
];

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create a new document
  const createNewDocument = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(DOCUMENTS_ENDPOINT, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: 'Untitled Document' })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        if (response.status === 401) {
          setIsAuthenticated(false);
          handleLogout();
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(errorData.message || 'Failed to create document');
      }
      
      const data = await response.json();
      if (!data.document?.id) {
        throw new Error('Invalid response from server');
      }
      
      navigate(`/documents/${data.document.id}`);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
      console.error('Error creating document:', err);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, isAuthenticated, setIsAuthenticated]);

  // Handle action item clicks
  const handleActionClick = useCallback((actionId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      switch (actionId) {
        case 'new-doc':
          createNewDocument();
          break;
        case 'upload':
          navigate("/upload");
          break;
        case 'new-team':
          // TODO: Implement team creation
          console.log("New team feature coming soon");
          break;
        default:
          console.warn(`Unknown action: ${actionId}`);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
      console.error('Error handling action:', err);
    }
  }, [createNewDocument, navigate, isAuthenticated]);

  // Handle folder click
  const handleFolderClick = useCallback((folderId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      navigate(`/folders/${folderId}`);
    } catch (err) {
      setError('Unable to open folder. Please try again.');
      console.error('Error opening folder:', err);
    }
  }, [navigate, isAuthenticated]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Topbar />
        <main className="p-6 max-w-7xl mx-auto">
          {/* Quick Actions Section */}
          <section className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-800 mb-4">
              Quick actions
            </h1>
            {error && (
              <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-700 hover:text-red-800"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {ACTION_ITEMS.map((item) => (
                <ActionCard
                  key={item.id}
                  {...item}
                  onClick={() => handleActionClick(item.id)}
                />
              ))}
            </div>
          </section>

          {/* Recent Folders Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Recent folders
              </h2>
              <button 
                className="text-blue-500 hover:text-blue-600 transition-colors"
                onClick={() => navigate('/folders')}
              >
                View all
              </button>
            </div>
            <Tabs />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              {FOLDER_ITEMS.map((folder) => (
                <FolderCard
                  key={folder.id}
                  {...folder}
                  onClick={() => handleFolderClick(folder.id)}
                />
              ))}
            </div>
          </section>
        </main>
      </div>
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500 mr-3"></div>
            <span>Creating document...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;