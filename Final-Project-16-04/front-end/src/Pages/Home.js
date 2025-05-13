import React, { useState, useCallback, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders, handleLogout } from '../utils/auth';
import { AuthContext } from "../App";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import FolderCard from "../components/FolderCard";
import ActionCard from "../components/ActionCard";
import Tabs from "../components/Tabs";
import { FaFolder, FaFileAlt, FaEllipsisV } from 'react-icons/fa';
import { FiPlusCircle, FiFolderPlus, FiUpload, FiFile } from 'react-icons/fi';

// API endpoints
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const DOCUMENTS_ENDPOINT = `${API_BASE_URL}/documents`;
const FILES_ENDPOINT = `${API_BASE_URL}/files`;
const FOLDERS_ENDPOINT = `${API_BASE_URL}/folders`;

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

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'recents', label: 'Recents' },
  { id: 'shared', label: 'Shared' },
  { id: 'favorites', label: 'Favorites' },
];

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderError, setFolderError] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderFiles, setFolderFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef();
  const [showNewFileMenu, setShowNewFileMenu] = useState(false);
  const newFileMenuRef = useRef();

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  // Close new file menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (newFileMenuRef.current && !newFileMenuRef.current.contains(e.target)) {
        setShowNewFileMenu(false);
      }
    };
    if (showNewFileMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNewFileMenu]);

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

  // Fetch folders and files for current folder
  useEffect(() => {
    const fetchData = async () => {
      try {
        let folderUrl = FOLDERS_ENDPOINT;
        let fileUrl = FILES_ENDPOINT;
        if (currentFolder) {
          folderUrl += `?parent_id=${currentFolder}`;
          fileUrl = `${FOLDERS_ENDPOINT}/${currentFolder}/files`;
        }
        // Fetch folders
        const folderRes = await fetch(folderUrl, { headers: getAuthHeaders() });
        const folderData = await folderRes.json();
        setFolders(folderData.folders || []);
        // Fetch files
        const fileRes = await fetch(fileUrl, { headers: getAuthHeaders() });
        const fileData = await fileRes.json();
        setFiles(fileData.files || []);
      } catch (err) {
        setFolders([]);
        setFiles([]);
      }
    };
    fetchData();
  }, [currentFolder]);

  // Handle folder click (navigate into folder)
  const handleFolderClick = async (folderId, folderName) => {
    // Prevent clicking on the same folder again
    if (currentFolder === folderId) {
      return;
    }
    setCurrentFolder(folderId);
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
  };

  // Handle breadcrumb click (navigate up)
  const handleBreadcrumbClick = (idx) => {
    if (idx === -1) {
      setCurrentFolder(null);
      setBreadcrumbs([]);
    } else {
      setCurrentFolder(breadcrumbs[idx].id);
      setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
    }
  };

  // Handle create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setFolderError("Folder name is required");
      return;
    }
    try {
      const response = await fetch(FOLDERS_ENDPOINT, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName })
      });
      if (!response.ok) throw new Error('Failed to create folder');
      const data = await response.json();
      setFolders([data.folder, ...folders]);
      setShowFolderModal(false);
      setNewFolderName("");
      setFolderError("");
    } catch (err) {
      setFolderError(err.message || 'Failed to create folder');
    }
  };

  // Filtered data for tabs
  const getTabData = () => {
    if (activeTab === 'all') {
      return { folders, files };
    } else if (activeTab === 'recents') {
      // Show 5 most recent folders/files
      const recentFolders = [...folders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
      const recentFiles = [...files].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)).slice(0, 5);
      return { folders: recentFolders, files: recentFiles };
    } else if (activeTab === 'shared') {
      // Placeholder: no shared logic yet
      return { folders: [], files: [] };
    } else if (activeTab === 'favorites') {
      // Placeholder: no favorites logic yet
      return { folders: [], files: [] };
    }
    return { folders, files };
  };
  const { folders: tabFolders, files: tabFiles } = getTabData();

  // Get combined and sorted items for the current view
  const getCombinedItems = () => {
    const combinedItems = [
      ...folders.map(folder => ({
        ...folder,
        type: 'folder',
        date: folder.created_at,
      })),
      ...files.map(file => ({
        ...file,
        type: 'file',
        date: file.created_at || file.uploaded_at,
      }))
    ];

    // Sort by date, newest first
    return combinedItems.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-4">
            {/* Header with New File Button */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">My Documents</h1>
              <div className="relative" ref={newFileMenuRef}>
                <button
                  onClick={() => setShowNewFileMenu(!showNewFileMenu)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiPlusCircle className="mr-2" />
                  New
                </button>
                
                {showNewFileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10">
                    <button
                      onClick={() => {
                        createNewDocument();
                        setShowNewFileMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      <FiFile className="mr-2" />
                      New Document
                    </button>
                    <button
                      onClick={() => {
                        navigate('/upload');
                        setShowNewFileMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      <FiUpload className="mr-2" />
                      Upload File
                    </button>
                    <button
                      onClick={() => {
                        setShowFolderModal(true);
                        setShowNewFileMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      <FiFolderPlus className="mr-2" />
                      New Folder
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2 mb-4">
              <button
                onClick={() => handleBreadcrumbClick(-1)}
                className={`text-sm ${currentFolder ? 'text-blue-600 hover:underline' : 'text-gray-600'}`}
              >
                Home
              </button>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  <span className="text-gray-400">/</span>
                  <button
                    onClick={() => handleBreadcrumbClick(idx)}
                    className={`text-sm ${
                      idx === breadcrumbs.length - 1
                        ? 'text-gray-600'
                        : 'text-blue-600 hover:underline'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Tabs */}
            <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Combined Grid */}
            {getCombinedItems().length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                {getCombinedItems().map(item => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className={`bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer ${
                      item.type === 'folder' && currentFolder === item.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => {
                      if (item.type === 'folder') {
                        handleFolderClick(item.id, item.name);
                      } else if (item.type === 'file') {
                        // Handle file click - you can add your file opening logic here
                        window.open(item.file_url, '_blank');
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        {item.type === 'folder' ? (
                          <FaFolder className="text-yellow-500 mr-3 text-xl" />
                        ) : (
                          <FaFileAlt className="text-blue-500 mr-3 text-xl" />
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900 truncate max-w-[200px]">
                            {item.name || item.file_name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {new Date(item.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button 
                        className="text-gray-400 hover:text-gray-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add your menu handling logic here
                        }}
                      >
                        <FaEllipsisV />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Empty State
              <div className="text-center py-12">
                <FaFolder className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new document or uploading a file.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-medium mb-4">Create New Folder</h2>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />
            {folderError && (
              <p className="text-red-500 text-sm mb-4">{folderError}</p>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setNewFolderName("");
                  setFolderError("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;