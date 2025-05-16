import React, { useState, useCallback, useContext, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getAuthHeaders, handleLogout } from '../utils/auth';
import { AuthContext } from "../App";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import FolderCard from "../components/FolderCard";
import ActionCard from "../components/ActionCard";
import Tabs from "../components/Tabs";
import { FaFolder, FaFileAlt, FaEllipsisV, FaRegClock } from 'react-icons/fa';
import { FiPlusCircle, FiFolderPlus, FiUpload, FiFile, FiStar, FiShare2 } from 'react-icons/fi';
import { FixedSizeGrid as Grid } from 'react-window';

// API endpoints
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const DOCUMENTS_ENDPOINT = `${API_BASE_URL}/documents`;
const FILES_ENDPOINT = `${API_BASE_URL}/files`;
const FOLDERS_ENDPOINT = `${API_BASE_URL}/folders`;
const ALL_FILES_ENDPOINT = `${API_BASE_URL}/all-files`;

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

// Memoized FileCard
const FileCard = React.memo(function FileCard({ file, onClick, onDragStart, style, children }) {
  return (
    <div
      style={style}
      className="group relative bg-white border border-gray-200 rounded-sm hover:border-blue-400 cursor-pointer transition-colors"
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      <div className="aspect-w-3 aspect-h-2 bg-gray-50 p-4 flex items-center justify-center">
        <FaFileAlt className="h-12 w-12 text-blue-400" />
      </div>
      {children}
    </div>
  );
});

// Local FolderCard for Home page
const LocalFolderCard = React.memo(function LocalFolderCard({ folder, onClick, onDrop, onDragOver, style, children }) {
  return (
    <div
      style={style}
      className="group relative bg-white border border-gray-200 rounded-sm hover:border-blue-400 cursor-pointer transition-colors"
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <div className="aspect-w-3 aspect-h-2 bg-gray-50 p-4 flex items-center justify-center">
        <FaFolder className="h-12 w-12 text-yellow-400" />
      </div>
      {children}
    </div>
  );
});

const Home = () => {
  const navigate = useNavigate();
  const { folderId } = useParams();
  const location = useLocation();
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
  const [openMenuId, setOpenMenuId] = useState(null);
  const [infoItem, setInfoItem] = useState(null);

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

  // Close New (+) menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (newFileMenuRef.current && !newFileMenuRef.current.contains(event.target)) {
        setShowNewFileMenu(false);
      }
    }
    if (showNewFileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNewFileMenu]);

  // Create a new document (collaborative, not file upload)
  const createNewDocument = useCallback(async (fileName) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!fileName.trim()) {
      setFileError("File name is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileError("");

    try {
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeaders()['Authorization']
        },
        body: JSON.stringify({
          title: fileName,
          content: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }]
          }
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
      navigate(`/documents/${data.document.id}`);
    } catch (err) {
      setFileError(err.message || 'An unexpected error occurred');
      console.error('Error creating document:', err);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, isAuthenticated, setIsAuthenticated]);

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
        // Fetch folders
        let folderUrl = FOLDERS_ENDPOINT;
        if (currentFolder) {
          folderUrl += `?parent_id=${currentFolder}`;
        }
        const folderRes = await fetch(folderUrl, { headers: getAuthHeaders() });
        if (!folderRes.ok) {
          if (folderRes.status === 401) {
            setIsAuthenticated(false);
            handleLogout();
            navigate('/login');
            throw new Error('Session expired. Please log in again.');
          }
          throw new Error('Failed to fetch folders');
        }
        const folderData = await folderRes.json();
        setFolders(folderData.folders || []);
        // Fetch all files and documents
        const allFilesRes = await fetch(ALL_FILES_ENDPOINT, { headers: getAuthHeaders() });
        if (!allFilesRes.ok) {
          if (allFilesRes.status === 401) {
            setIsAuthenticated(false);
            handleLogout();
            navigate('/login');
            throw new Error('Session expired. Please log in again.');
          }
          throw new Error('Failed to fetch files and documents');
        }
        const allFilesData = await allFilesRes.json();
        setFiles(allFilesData.items || []);
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
  }, [currentFolder, setIsAuthenticated, navigate]);

  // Handle folder click (navigate into folder)
  const handleFolderClick = (folderId, folderName) => {
    navigate(`/folders/${folderId}`);
  };

  // Set currentFolder from URL
  useEffect(() => {
    setCurrentFolder(folderId || null);
  }, [folderId]);

  // Handle breadcrumb click (navigate up)
  const handleBreadcrumbClick = (idx) => {
    if (idx === -1) {
      navigate(`/`);
    } else {
      const crumb = breadcrumbs[idx];
      if (crumb && crumb.id) {
        navigate(`/folders/${crumb.id}`);
      }
    }
  };

  // Back button handler (browser history)
  const handleBack = () => {
    navigate(-1);
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
    // Only show folders and documents (files uploaded through document handler)
    return [
      ...folders.map(folder => ({
        ...folder,
        type: 'folder',
        date: folder.created_at,
      })),
      ...files
        .filter(f => {
          // Only show items that are documents or have content (indicating they were uploaded as documents)
          const isDocument = f.type === 'document' || f.content;
          // Only show items in current folder if one is selected
          const inCurrentFolder = !currentFolder || f.folder_id === currentFolder;
          return isDocument && inCurrentFolder;
        })
        .map(file => ({
          ...file,
          date: file.createdAt || file.created_at || file.uploaded_at,
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Handle file click
  const handleFileClick = (file) => {
    if (file.type === 'document') {
      navigate(`/documents/${file.id}`);
    } else if (file.type === 'file') {
      // For other files, try to open them
      if (file.url || file.file_url) {
        window.open(file.url || file.file_url, '_blank');
      } else {
        setError('File URL not found');
      }
    }
  };

  // Delete handlers
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`${DOCUMENTS_ENDPOINT}/${itemId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete item");
      setFiles(files => files.filter(f => f.id !== itemId));
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Are you sure you want to delete this folder?")) return;
    try {
      const res = await fetch(`${FOLDERS_ENDPOINT}/${folderId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete folder");
      setFolders(folders => folders.filter(f => f.id !== folderId));
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  };

  // Download handler (for files)
  const handleDownloadFile = (file) => {
    if (file.file_url) {
      window.open(file.file_url, '_blank');
    } else {
      alert('No download URL available.');
    }
  };

  // Info handler
  const handleShowInfo = (item) => {
    setInfoItem(item);
    setOpenMenuId(null);
  };

  const handleCloseInfo = () => setInfoItem(null);

  // Drag and drop: move file to folder
  const handleMoveFileToFolder = async (fileId, folderId) => {
    try {
      const res = await fetch(`${FILES_ENDPOINT}/${fileId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder_id: folderId })
      });
      if (!res.ok) throw new Error('Failed to move file');
      setFiles(files => files.map(f => f.id === fileId ? { ...f, folder_id: folderId } : f));
    } catch (err) {
      alert(err.message || 'Move failed');
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
                {breadcrumbs.length > 0 && (
                  <nav className="flex items-center text-sm text-gray-500 space-x-1">
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
                          className="hover:text-blue-600 hover:underline"
                        >
                          {crumb.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </nav>
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
                  <div ref={newFileMenuRef} className="absolute right-6 mt-32 w-48 bg-white rounded-sm shadow-lg py-1 z-10 border border-gray-200">
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

            {/* Back button if inside a folder */}
            {currentFolder && (
              <button
                onClick={handleBack}
                className="mb-4 px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
              >
                ← Back
              </button>
            )}

            {/* Content Grid */}
            {!isFetching && getCombinedItems().length > 0 ? (
              getCombinedItems().length <= 20 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {getCombinedItems().map((item, idx) => (
                    item.type === 'folder' ? (
                      <LocalFolderCard
                        key={`folder-${item.id}`}
                        folder={item}
                        onClick={() => handleFolderClick(item.id, item.name)}
                        onDrop={e => {
                          e.preventDefault();
                          const fileId = e.dataTransfer.getData('fileId');
                          if (fileId) handleMoveFileToFolder(fileId, item.id);
                        }}
                        onDragOver={e => e.preventDefault()}
                        style={{}}
                      >
                        <div className="p-3">
                          <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                            {item.title || item.name || item.file_name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.date).toLocaleDateString()}
                          </p>
                        </div>
                        {/* Ellipsis menu button and dropdown menu */}
                        <button
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 group-hover:opacity-100 transition-opacity"
                          onClick={e => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === `folder-${item.id}` ? null : `folder-${item.id}`);
                          }}
                        >
                          <FaEllipsisV className="h-4 w-4" />
                        </button>
                        {openMenuId === `folder-${item.id}` && (
                          <div className="absolute right-2 top-8 z-20 bg-white border border-gray-200 rounded shadow-md w-36">
                            <button
                              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                              onClick={e => { e.stopPropagation(); handleShowInfo(item); }}
                            >
                              Info
                            </button>
                            <button
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              onClick={e => { e.stopPropagation(); handleDeleteItem(item.id); setOpenMenuId(null); }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </LocalFolderCard>
                    ) : (
                      <FileCard
                        key={`file-${item.id}`}
                        file={item}
                        onClick={() => handleFileClick(item)}
                        onDragStart={e => {
                          e.dataTransfer.setData('fileId', item.id);
                        }}
                        style={{}}
                      >
                        <div className="p-3">
                          <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                            {item.title || item.name || item.file_name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.date).toLocaleDateString()}
                          </p>
                        </div>
                        {/* Ellipsis menu button and dropdown menu */}
                        <button
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 group-hover:opacity-100 transition-opacity"
                          onClick={e => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === `file-${item.id}` ? null : `file-${item.id}`);
                          }}
                        >
                          <FaEllipsisV className="h-4 w-4" />
                        </button>
                        {openMenuId === `file-${item.id}` && (
                          <div className="absolute right-2 top-8 z-20 bg-white border border-gray-200 rounded shadow-md w-36">
                            <button
                              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                              onClick={e => { e.stopPropagation(); handleDownloadFile(item); setOpenMenuId(null); }}
                            >
                              Download
                            </button>
                            <button
                              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                              onClick={e => { e.stopPropagation(); handleShowInfo(item); }}
                            >
                              Info
                            </button>
                            <button
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              onClick={e => { e.stopPropagation(); handleDeleteItem(item.id); setOpenMenuId(null); }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </FileCard>
                    )
                  ))}
                </div>
              ) : (
                <Grid
                  columnCount={4}
                  columnWidth={250}
                  height={600}
                  rowCount={Math.ceil(getCombinedItems().length / 4)}
                  rowHeight={160}
                  width={1040}
                >
                  {({ columnIndex, rowIndex, style }) => {
                    const items = getCombinedItems();
                    const itemIndex = rowIndex * 4 + columnIndex;
                    if (itemIndex >= items.length) return null;
                    const item = items[itemIndex];
                    if (item.type === 'folder') {
                      return (
                        <LocalFolderCard
                          key={`folder-${item.id}`}
                          folder={item}
                          onClick={() => handleFolderClick(item.id, item.name)}
                          onDrop={e => {
                            e.preventDefault();
                            const fileId = e.dataTransfer.getData('fileId');
                            if (fileId) handleMoveFileToFolder(fileId, item.id);
                          }}
                          onDragOver={e => e.preventDefault()}
                          style={style}
                        >
                          <div className="p-3">
                            <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                              {item.title || item.name || item.file_name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(item.date).toLocaleDateString()}
                            </p>
                          </div>
                          {/* Ellipsis menu button and dropdown menu */}
                          <button
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 group-hover:opacity-100 transition-opacity"
                            onClick={e => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === `folder-${item.id}` ? null : `folder-${item.id}`);
                            }}
                          >
                            <FaEllipsisV className="h-4 w-4" />
                          </button>
                          {openMenuId === `folder-${item.id}` && (
                            <div className="absolute right-2 top-8 z-20 bg-white border border-gray-200 rounded shadow-md w-36">
                              <button
                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                onClick={e => { e.stopPropagation(); handleShowInfo(item); }}
                              >
                                Info
                              </button>
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                onClick={e => { e.stopPropagation(); handleDeleteItem(item.id); setOpenMenuId(null); }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </LocalFolderCard>
                      );
                    } else {
                      return (
                        <FileCard
                          key={`file-${item.id}`}
                          file={item}
                          onClick={() => handleFileClick(item)}
                          onDragStart={e => {
                            e.dataTransfer.setData('fileId', item.id);
                          }}
                          style={style}
                        >
                          <div className="p-3">
                            <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                              {item.title || item.name || item.file_name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(item.date).toLocaleDateString()}
                            </p>
                          </div>
                          {/* Ellipsis menu button and dropdown menu */}
                          <button
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 group-hover:opacity-100 transition-opacity"
                            onClick={e => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === `file-${item.id}` ? null : `file-${item.id}`);
                            }}
                          >
                            <FaEllipsisV className="h-4 w-4" />
                          </button>
                          {openMenuId === `file-${item.id}` && (
                            <div className="absolute right-2 top-8 z-20 bg-white border border-gray-200 rounded shadow-md w-36">
                              <button
                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                onClick={e => { e.stopPropagation(); handleDownloadFile(item); setOpenMenuId(null); }}
                              >
                                Download
                              </button>
                              <button
                                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                onClick={e => { e.stopPropagation(); handleShowInfo(item); }}
                              >
                                Info
                              </button>
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                onClick={e => { e.stopPropagation(); handleDeleteItem(item.id); setOpenMenuId(null); }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </FileCard>
                      );
                    }
                  }}
                </Grid>
              )
            ) : !isFetching && (
              <div className="text-center py-12">
                <FaFolder className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No documents or folders</h3>
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

      {/* Info Modal */}
      {infoItem && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96 shadow-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={handleCloseInfo}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold mb-4">Item Info</h2>
            <div className="space-y-2">
              <div><span className="font-medium">Type:</span> {infoItem.type}</div>
              <div><span className="font-medium">Name:</span> {infoItem.title || infoItem.name || infoItem.file_name}</div>
              {infoItem.uploaded_at && <div><span className="font-medium">Uploaded at:</span> {new Date(infoItem.uploaded_at).toLocaleString()}</div>}
              {infoItem.created_at && <div><span className="font-medium">Created at:</span> {new Date(infoItem.created_at).toLocaleString()}</div>}
              {infoItem.createdAt && <div><span className="font-medium">Created at:</span> {new Date(infoItem.createdAt).toLocaleString()}</div>}
              {infoItem.updatedAt && <div><span className="font-medium">Updated at:</span> {new Date(infoItem.updatedAt).toLocaleString()}</div>}
              {infoItem.user_id && <div><span className="font-medium">Uploaded by (user id):</span> {infoItem.user_id}</div>}
              {infoItem.userId && <div><span className="font-medium">Uploaded by (user id):</span> {infoItem.userId}</div>}
              {infoItem.file_url && <div><span className="font-medium">File URL:</span> <a href={infoItem.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">Open</a></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;