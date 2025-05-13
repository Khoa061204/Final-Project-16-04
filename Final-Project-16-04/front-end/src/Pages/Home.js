import React, { useState, useCallback, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders, handleLogout } from '../utils/auth';
import { AuthContext } from "../App";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import FolderCard from "../components/FolderCard";
import ActionCard from "../components/ActionCard";
import Tabs from "../components/Tabs";
import { FaFolder, FaFileAlt, FaEllipsisV, FaRegClock } from 'react-icons/fa';
import { FiPlusCircle, FiFolderPlus, FiUpload, FiFile, FiStar, FiShare2 } from 'react-icons/fi';

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

const QUICK_ACCESS_TABS = [
  { id: 'all', label: 'All', icon: <FiFile /> },
  { id: 'recent', label: 'Recent', icon: <FaRegClock /> },
  { id: 'shared', label: 'Shared', icon: <FiShare2 /> },
  { id: 'favorites', label: 'Favorites', icon: <FiStar /> },
];

const ALLOWED_EXTENSIONS = ['.txt', '.doc', '.md'];

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
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [fileExtension, setFileExtension] = useState(".txt");
  const [fileError, setFileError] = useState("");
  const [fileContent, setFileContent] = useState(null);
  const [isFetching, setIsFetching] = useState(false);

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
  const createNewDocument = useCallback(async (fileName) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!fileName.trim()) {
      setFileError("File name is required");
      return;
    }

    // Add extension if not present
    const fullFileName = fileName.includes('.') ? fileName : `${fileName}${fileExtension}`;

    setIsLoading(true);
    setError(null);
    setFileError("");

    try {
      const response = await fetch(DOCUMENTS_ENDPOINT, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: fullFileName,
          content: JSON.stringify({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }]
          }),
          parent_id: currentFolder || null
        })
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
      
      setShowNewFileModal(false);
      setNewFileName("");
      // Navigate to the editor with the new document ID
      navigate(`/editor/${data.document.id}`);
    } catch (err) {
      setFileError(err.message || 'An unexpected error occurred');
      console.error('Error creating document:', err);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, isAuthenticated, setIsAuthenticated, currentFolder, fileExtension]);

  // Create a new folder
  const createNewFolder = async (folderName) => {
    if (!folderName.trim()) {
      setFolderError("Folder name is required");
      return;
    }

    try {
      const response = await fetch(FOLDERS_ENDPOINT, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          parent_id: currentFolder || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create folder');
      }

      const data = await response.json();
      setFolders(prevFolders => [data.folder, ...prevFolders]);
      setShowFolderModal(false);
      setNewFolderName("");
      setFolderError("");
    } catch (err) {
      setFolderError(err.message || 'Failed to create folder');
    }
  };

  // Handle new item creation
  const handleNewItem = (type) => {
    setShowNewFileMenu(false);
    
    switch (type) {
      case 'document':
        setShowNewFileModal(true);
        break;
      case 'folder':
        setShowFolderModal(true);
        break;
      case 'upload':
        navigate('/upload');
        break;
      default:
        console.warn(`Unknown item type: ${type}`);
    }
  };

  // Fetch folders and files for current folder
  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      setError(null);
      
      try {
        let folderUrl = FOLDERS_ENDPOINT;
        let fileUrl = FILES_ENDPOINT;
        
        if (currentFolder) {
          folderUrl += `?parent_id=${currentFolder}`;
          fileUrl = `${FOLDERS_ENDPOINT}/${currentFolder}/files`;
        }

        // Fetch folders
        const folderRes = await fetch(folderUrl, { 
          headers: getAuthHeaders() 
        });
        
        if (!folderRes.ok) {
          if (folderRes.status === 401) {
            setIsAuthenticated(false);
            handleLogout();
            throw new Error('Session expired. Please log in again.');
          }
          throw new Error('Failed to fetch folders');
        }
        
        const folderData = await folderRes.json();
        setFolders(folderData.folders || []);

        // Fetch files
        const fileRes = await fetch(fileUrl, { 
          headers: getAuthHeaders() 
        });
        
        if (!fileRes.ok) {
          throw new Error('Failed to fetch files');
        }
        
        const fileData = await fileRes.json();
        setFiles(fileData.files || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load content');
        setFolders([]);
        setFiles([]);
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [currentFolder, setIsAuthenticated]);

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

  // Filtered data for tabs
  const getTabData = () => {
    if (activeTab === 'all') {
      return { folders, files };
    } else if (activeTab === 'recent') {
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

  // Handle file click
  const handleFileClick = async (file) => {
    try {
      const response = await fetch(`${DOCUMENTS_ENDPOINT}/${file.id}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load file');
      }

      const data = await response.json();
      
      // Check file extension
      const fileExt = file.name.split('.').pop().toLowerCase();
      
      if (fileExt === 'txt' || fileExt === 'md' || fileExt === 'doc') {
        // Navigate to editor for editable files
        navigate(`/editor/${file.id}`);
      } else {
        // For other files, try to open them
        if (file.file_url) {
          window.open(file.file_url, '_blank');
        } else {
          throw new Error('File URL not found');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to open file');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-white">
          {/* Quick access section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              {QUICK_ACCESS_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === tab.id
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-4">
            {/* Header with actions */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900">My Documents</h1>
                {currentFolder && (
                  <div className="flex items-center text-sm text-gray-500 space-x-2">
                    <button
                      onClick={() => handleBreadcrumbClick(-1)}
                      className="hover:text-blue-600 hover:underline"
                    >
                      Home
                    </button>
                    {breadcrumbs.map((crumb, idx) => (
                      <React.Fragment key={crumb.id}>
                        <span>/</span>
                        <button
                          onClick={() => handleBreadcrumbClick(idx)}
                          className={`hover:text-blue-600 hover:underline ${
                            idx === breadcrumbs.length - 1 ? 'text-gray-900' : ''
                          }`}
                        >
                          {crumb.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowNewFileMenu(!showNewFileMenu)}
                  className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-sm hover:bg-blue-700 text-sm font-medium"
                >
                  <FiPlusCircle className="mr-1.5 h-4 w-4" />
                  New
                </button>
                
                {showNewFileMenu && (
                  <div className="absolute right-6 mt-32 w-48 bg-white rounded-sm shadow-lg py-1 z-10 border border-gray-200">
                    <button
                      onClick={() => handleNewItem('document')}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-50"
                    >
                      <FiFile className="mr-3 h-4 w-4 text-blue-600" />
                      New Document
                    </button>
                    <button
                      onClick={() => handleNewItem('upload')}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-50"
                    >
                      <FiUpload className="mr-3 h-4 w-4 text-blue-600" />
                      Upload File
                    </button>
                    <button
                      onClick={() => handleNewItem('folder')}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-50"
                    >
                      <FiFolderPlus className="mr-3 h-4 w-4 text-blue-600" />
                      New Folder
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-sm">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {isFetching && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Content Grid */}
            {!isFetching && getCombinedItems().length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {getCombinedItems().map(item => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => {
                      if (item.type === 'folder') {
                        handleFolderClick(item.id, item.name);
                      } else {
                        handleFileClick(item);
                      }
                    }}
                    className={`group relative bg-white border border-gray-200 rounded-sm hover:border-blue-400 cursor-pointer transition-colors ${
                      item.type === 'folder' && currentFolder === item.id ? 'border-blue-500' : ''
                    }`}
                  >
                    <div className="aspect-w-3 aspect-h-2 bg-gray-50 p-4 flex items-center justify-center">
                      {item.type === 'folder' ? (
                        <FaFolder className="h-12 w-12 text-yellow-400" />
                      ) : (
                        <FaFileAlt className="h-12 w-12 text-blue-400" />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                        {item.name || item.file_name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Add menu handling logic here
                      }}
                    >
                      <FaEllipsisV className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : !isFetching && (
              <div className="text-center py-12">
                <FaFolder className="mx-auto h-12 w-12 text-gray-300" />
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
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white rounded-sm p-6 w-96 shadow-lg">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Folder</h2>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {folderError && (
              <p className="text-sm text-red-600 mt-2">{folderError}</p>
            )}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setNewFolderName("");
                  setFolderError("");
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => createNewFolder(newFolderName)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-sm hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New File Modal with Extension Selection */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white rounded-sm p-6 w-96 shadow-lg">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Document</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
                  File Name
                </label>
                <input
                  id="fileName"
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Enter file name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label htmlFor="fileExtension" className="block text-sm font-medium text-gray-700 mb-1">
                  File Type
                </label>
                <select
                  id="fileExtension"
                  value={fileExtension}
                  onChange={(e) => setFileExtension(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {ALLOWED_EXTENSIONS.map(ext => (
                    <option key={ext} value={ext}>
                      {ext.toUpperCase()} Document
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {fileError && (
              <p className="text-sm text-red-600 mt-2">{fileError}</p>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewFileModal(false);
                  setNewFileName("");
                  setFileError("");
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => createNewDocument(newFileName)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-sm hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white rounded-sm p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Creating document...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;