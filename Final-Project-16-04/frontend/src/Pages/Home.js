import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuthHeaders, getToken } from '../utils/auth.js';
import { getApiUrl } from '../config/api.js';
import { AuthContext } from "../App";
import { FaFolder, FaFileAlt, FaPlus, FaUpload, FaThList, FaThLarge, FaEllipsisV, FaShareAlt, FaFileArchive, FaFilePdf, FaFileImage, FaFileVideo, FaFileWord, FaFileExcel, FaFile, FaStar, FaRegStar, FaCheckSquare, FaSquare, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import { Menu, Transition } from '@headlessui/react';
import ItemMenu from '../components/ItemMenu';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Breadcrumb from '../components/Breadcrumb';
import FolderCard from '../components/FolderCard';
import DragDropUpload from '../components/DragDropUpload';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import CustomTooltip from '../components/CustomTooltip';
import UserSearch from '../components/UserSearch';
import ShareModal from '../components/ShareModal';
import { Document as PDFDocument, Page as PDFPage, pdfjs } from 'react-pdf';
import 'pdfjs-dist/web/pdf_viewer.css';

// Set the workerSrc after all imports
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'recent', label: 'Recently opened' },
  { id: 'shared-with-me', label: 'Shared with Me' },
  { id: 'favorites', label: 'Favorites' },
];

// Utility to extract plain text from Tiptap/ProseMirror JSON
function extractPlainTextFromTiptap(doc) {
  if (!doc) return '';
  if (typeof doc === 'string') {
    try { doc = JSON.parse(doc); } catch { return doc; }
  }
  let text = '';
  function traverse(node) {
    if (!node) return;
    if (node.type === 'text' && node.text) {
      text += node.text;
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(traverse);
      text += '\n'; // Add newlines between paragraphs
    }
  }
  traverse(doc);
  return text.trim();
}

const Home = ({ teams: propTeams }) => {
  const navigate = useNavigate();
  const { folderId } = useParams();
  const { isAuthenticated, user } = useContext(AuthContext);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const plusMenuRef = useRef();

  // For new folder modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderError, setFolderError] = useState("");

  // For new document modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [docError, setDocError] = useState("");

  const [draggedItem, setDraggedItem] = useState(null);
  const [viewStyle, setViewStyle] = useState('list'); // 'list' or 'grid'

  // Required state for shared items and modals functionality
  const [sharedItems, setSharedItems] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTab, setShareTab] = useState('team');
  const [teamUsers, setTeamUsers] = useState([]);

  // Add state for info modal
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoItem, setInfoItem] = useState(null);

  // Add state for openMenuId
  const [openMenuId, setOpenMenuId] = useState(null);

  // Add state for mass delete functionality (defined before keyboard shortcuts)
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Keyboard shortcuts handlers
  const handleSearchShortcut = () => {
    const searchInput = document.querySelector('input[placeholder*="Search"]');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  };

  const handleNewDocumentShortcut = () => {
    setShowDocModal(true);
  };

  const handleNewFolderShortcut = () => {
    setShowFolderModal(true);
  };

  const handleUploadShortcut = () => {
    navigate('/upload');
  };

  const handleDeleteShortcut = () => {
    if (selectedItems.length > 0) {
      handleMassDelete();
    }
  };

  const handleEscapeShortcut = () => {
    if (isSelectionMode) {
      toggleSelectionMode();
    }
    if (showFolderModal) setShowFolderModal(false);
    if (showDocModal) setShowDocModal(false);
    if (showShareModal) setShowShareModal(false);
    if (showInfoModal) setShowInfoModal(false);
    if (showPDFModal) setShowPDFModal(false);
    if (showImageModal) setShowImageModal(false);
    if (showVideoModal) setShowVideoModal(false);
  };

  const handleEnterShortcut = () => {
    if (selectedItems.length === 1) {
      const item = selectedItems[0];
      handleRowClick(item);
    }
  };

  // Data fetching function (defined before keyboard shortcuts)
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch folders for current location
      const folderUrl = folderId ? 
        `${getApiUrl('folders')}?parent_id=${folderId}` : 
        getApiUrl('folders');
      
      const folderRes = await fetch(folderUrl, { headers: getAuthHeaders() });
      
      if (!folderRes.ok) throw new Error('Failed to fetch folders');
      const folderData = await folderRes.json();
      setFolders(folderData.folders || []);

      // Fetch files for current location
      const filesRes = await fetch(`${getApiUrl('files')}${folderId ? `?folder_id=${folderId}` : '?root=true'}`, { 
        headers: getAuthHeaders() 
      });
      if (!filesRes.ok) throw new Error('Failed to fetch files');
      const filesData = await filesRes.json();

      // Fetch documents for current location
      const documentsRes = await fetch(`${getApiUrl('documents')}${folderId ? `?folder_id=${folderId}` : '?root=true'}`, { 
        headers: getAuthHeaders() 
      });
      if (!documentsRes.ok) throw new Error('Failed to fetch documents');
      const documentsData = await documentsRes.json();
      setDocuments(documentsData.documents || []);

      // Combine files and documents with proper type checking
      const allFiles = [
        ...(documentsData.documents || []).map(doc => ({
          ...doc,
          type: 'document',
          name: doc.title || 'Untitled Document',
          date: doc.updatedAt || doc.createdAt,
          status: 'You edited this',
          folder_id: doc.folder_id || null,
          is_favorite: doc.is_favorite || false,
        })),
        ...(filesData.files || []).map(file => ({
          ...file,
          type: 'file',
          name: file.file_name || 'Untitled File',
          date: file.uploaded_at || file.createdAt,
          status: '',
          folder_id: file.folder_id || null,
          is_favorite: file.is_favorite || false,
        }))
      ];

  
      
      setFiles(allFiles);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Selection mode functions (defined before keyboard shortcuts)
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedItems([]);
    }
  };

  const toggleItemSelection = (item) => {
    const itemId = item._id || item.id;
    setSelectedItems(prev => {
      if (prev.find(selected => (selected._id || selected.id) === itemId)) {
        return prev.filter(selected => (selected._id || selected.id) !== itemId);
      } else {
        return [...prev, item];
      }
    });
  };

  const selectAllItems = () => {
    setSelectedItems([...listData]);
  };

  const deselectAllItems = () => {
    setSelectedItems([]);
  };

  const isItemSelected = (item) => {
    const itemId = item._id || item.id;
    return selectedItems.find(selected => (selected._id || selected.id) === itemId);
  };

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: handleSearchShortcut,
    onNewDocument: handleNewDocumentShortcut,
    onNewFolder: handleNewFolderShortcut,
    onUpload: handleUploadShortcut,
    onDelete: handleDeleteShortcut,
    onSelectAll: selectAllItems,
    onDeselectAll: deselectAllItems,
    onRefresh: fetchData,
    onToggleSelectionMode: toggleSelectionMode,
    onEscape: handleEscapeShortcut,
    onEnter: handleEnterShortcut,
    isSelectionMode,
    selectedItems
  });

  // PDF and video modal states
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("");

  // Add state for image and video preview modals
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Add state for extract modal
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractTarget, setExtractTarget] = useState(null);
  const [extractFolderName, setExtractFolderName] = useState("");
  const [extractError, setExtractError] = useState("");
  const [extractLoading, setExtractLoading] = useState(false);



  // Add state for folder contents modal
  const [showFolderContentsModal, setShowFolderContentsModal] = useState(false);
  const [folderContents, setFolderContents] = useState(null);
  const [folderContentsLoading, setFolderContentsLoading] = useState(false);

  // Use teams from prop or context
  const teams = propTeams || [];

  useEffect(() => {
    if (isAuthenticated) {
  
      fetchData();
    }
  }, [isAuthenticated, folderId]);

  // Close plus menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target)) {
        setShowPlusMenu(false);
      }
    }
    if (showPlusMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlusMenu]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest('.custom-dropdown')) setOpenMenuId(null);
    }
    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Filter folders for current location
  const filteredFolders = folders.filter(folder => {
    // For root level (no folderId), show folders with no parent
    if (!folderId) {
      return !folder.parent_id;
    }
    // For subfolder level, show folders with matching parent
    return folder.parent_id === folderId;
  });

  // Filter files/documents for current location
  const filteredFiles = files.filter(item => {
    // For root level (no folderId), show items with no folder_id
    if (!folderId) {
      return !item.folder_id;
    }
    // For subfolder level, show items with matching folder_id
    // Convert both to strings for comparison to handle type mismatches
    const itemFolderId = String(item.folder_id);
    const currentFolderId = String(folderId);
    const matches = itemFolderId === currentFolderId;
    if (item.folder_id && folderId) {
      
    }
    return matches;
  });

  // Debug logging only when folderId changes or in development
  if (process.env.NODE_ENV === 'development' && folderId !== undefined) {

  }

  // Define fetchSharedItems function first
  const fetchSharedItems = async () => {
    try {
      console.log('🔍 Fetching shared items from:', getApiUrl('/shares') + '/shared-with-me');
      const response = await fetch(getApiUrl('/shares') + `/shared-with-me?page=1&limit=100`, { 
        headers: getAuthHeaders() 
      });
      
      console.log('📡 Shared items response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Shared items response data:', data);
        if (data.success) {
          const items = (data.data.items || []).map(it => ({
            ...it,
            // normalize to match file open/download logic
            s3Key: it.s3Key || it.s3key || it.s3_key || null,
            file_url: it.resourceUrl || null,
            name: it.resourceName || it.name,
            type: it.resourceType
          }));
          console.log('✅ Setting shared items:', items.length, 'items');
          setSharedItems(items);
        } else {
          console.log('❌ Response not successful:', data);
          setSharedItems([]);
        }
      } else if (response.status === 404) {
        // Endpoint doesn't exist yet, show empty state
        setSharedItems([]);
        console.warn('Shared items endpoint not implemented yet');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Error fetching shared items:', response.status, errorData.message);
        setSharedItems([]);
      }
    } catch (error) {
      console.error('❌ Error fetching shared items:', error);
      setSharedItems([]);
    }
  };

  // Fetch shared items when switching to shared-with-me tab (consolidated useEffect)
  useEffect(() => {
    if (activeTab === 'shared-with-me' && isAuthenticated) {
      fetchSharedItems();
    }
  }, [activeTab, isAuthenticated]);

  // Define fetchTeamUsers function first
  const fetchTeamUsers = async () => {
    try {
      const res = await fetch(`${getApiUrl('teams')}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch teams');
      const data = await res.json();
      // Flatten all team members, unique by id
      const users = {};
      (data.teams || []).forEach(team => {
        (team.members || []).forEach(member => {
          users[member.id] = member;
        });
      });
      setTeamUsers(Object.values(users));
    } catch (err) {
      setTeamUsers([]);
    }
  };

  // Fetch team users for sharing
  useEffect(() => {
    if (showShareModal && shareTab === 'team') {
      fetchTeamUsers();
    }
  }, [showShareModal, shareTab]);

  // Tab filtering
  const getListData = () => {
    if (activeTab === 'shared-with-me') {
      // Show items shared with the current user
      return sharedItems.map(item => ({
        ...item,
        type: item.resourceType || item.type,
        name: item.resourceName || item.name || item.title || 'Untitled',
        date: item.sharedAt || item.createdAt,
        status: `Shared by ${item.owner?.username || item.owner?.name || 'Unknown'}`,
        permission: item.permission || 'view',
      }));
    }
    let allRows = [
      ...filteredFolders.map(folder => ({
        ...folder,
        type: 'folder',
        name: folder.name,
        date: folder.created_at,
        status: '',
      })),
      ...filteredFiles
    ];
    if (activeTab === 'recent') {
      allRows = allRows.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    }
    if (activeTab === 'favorites') {
      allRows = allRows.filter(item => item.is_favorite === true);
    }
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      allRows = allRows.filter(item => (item.name || '').toLowerCase().includes(term));
    }
    return allRows;
  };
  const listData = getListData();
  


  // Actions
  const handleRowClick = async (item) => {
    // If in selection mode, toggle selection instead of normal click
    if (isSelectionMode) {
      toggleItemSelection(item);
      return;
    }

    // For shared items, use resourceId instead of id
    const itemId = item.resourceId || item.id;
    console.log('🖱️ Clicking item:', { type: item.type, itemId, originalId: item.id, resourceId: item.resourceId });

    if (item.type === 'folder') {
      navigate(`/folders/${itemId}`);
    } else if (item.type === 'document') {
      navigate(`/documents/${itemId}`);
    } else if (item.type === 'file') {
      // Prefer s3Key + signed URL; fallback to file_url if exists
      const ext = item.name?.split('.').pop()?.toLowerCase();
      
      // Auto-open extract modal for ZIP/RAR files
      if (ext === 'zip' || ext === 'rar') {
        handleExtract(item);
        return;
      }
      
      if (ext === 'pdf') {
        if (!item.s3Key) {
          console.error('Missing s3Key for item:', item);
          alert('This file is missing a valid S3 key and cannot be previewed.');
          return;
        }
        try {
          // Fetch signed URL from backend
          const res = await fetch(`${getApiUrl('files')}/signed-url?key=${encodeURIComponent(item.s3Key)}`, { headers: getAuthHeaders() });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Signed URL error:', res.status, errorData);
            
            if (res.status === 404) {
              alert('File not found in database. This file may have been deleted or corrupted.');
            } else if (res.status === 403) {
              alert('Access denied. You do not have permission to access this file.');
            } else {
              alert('Failed to get signed URL: ' + (errorData.message || res.status));
            }
            return;
          }
          const data = await res.json();
          setPdfUrl(data.url);
          setShowPDFModal(true);
        } catch (err) {
          console.error('PDF preview error:', err);
          alert('Failed to load PDF for preview: ' + err.message);
        }
      } else if (["mp4", "avi", "mov", "mkv", "wmv", "webm", "ogg"].includes(ext)) {
        // Handle video files
        if (!item.s3Key) {
          console.error('Missing s3Key for item:', item);
          alert('This file is missing a valid S3 key and cannot be previewed.');
          return;
        }
        try {
          const res = await fetch(`${getApiUrl('files')}/signed-url?key=${encodeURIComponent(item.s3Key)}`, { headers: getAuthHeaders() });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Signed URL error:', res.status, errorData);
            
            if (res.status === 404) {
              alert('File not found. This file may have been deleted or corrupted.');
            } else if (res.status === 403) {
              alert('Access denied. You do not have permission to access this file.');
            } else {
              alert('Failed to get signed URL: ' + (errorData.message || res.status));
            }
            return;
          }
          const data = await res.json();
          setVideoUrl(data.url);
          setVideoType(`video/${ext === 'mov' ? 'quicktime' : ext}`);
          setShowVideoModal(true);
        } catch (err) {
          console.error('Video preview error:', err);
          alert('Failed to load video for preview: ' + err.message);
        }
      } else if (["jpg","jpeg","png","gif","bmp","webp","svg"].includes(ext)) {
        // Get signed URL for image preview
        try {
          const res = await fetch(`${getApiUrl('files')}/signed-url?key=${encodeURIComponent(item.s3Key)}`, { headers: getAuthHeaders() });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Signed URL error:', res.status, errorData);
            
            if (res.status === 404) {
              alert('File not found in database. This file may have been deleted or corrupted.');
            } else if (res.status === 403) {
              alert('Access denied. You do not have permission to access this file.');
            } else {
              alert('Failed to get signed URL: ' + (errorData.message || res.status));
            }
            return;
          }
          const data = await res.json();
          setImageUrl(data.url);
          setShowImageModal(true);
        } catch (err) {
          console.error('Image preview error:', err);
          alert('Failed to load image for preview: ' + err.message);
        }
      } else {
        // Get signed URL for other file types
        try {
          const res = await fetch(`${getApiUrl('files')}/signed-url?key=${encodeURIComponent(item.s3Key)}`, { headers: getAuthHeaders() });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Signed URL error:', res.status, errorData);
            
            if (res.status === 404) {
              alert('File not found in database. This file may have been deleted or corrupted.');
            } else if (res.status === 403) {
              alert('Access denied. You do not have permission to access this file.');
            } else {
              alert('Failed to get signed URL: ' + (errorData.message || res.status));
            }
            return;
          }
          const data = await res.json();
          window.open(data.url, '_blank');
        } catch (err) {
          console.error('File open error:', err);
          alert('Failed to open file: ' + err.message);
        }
      }
    }
  };

  // + menu actions
  const handlePlusMenu = (action) => {
    setShowPlusMenu(false);
    if (action === 'new-doc') setShowDocModal(true);
    if (action === 'new-folder') setShowFolderModal(true);
    if (action === 'upload') navigate('/upload');
  };

  // Create new folder
  const createNewFolder = async () => {
    if (!newFolderName.trim()) {
      setFolderError("Folder name is required");
      return;
    }
    try {
      const response = await fetch(getApiUrl('folders'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newFolderName,
          parent_id: folderId || null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create folder');
      }
      
      const data = await response.json();
      console.log('✅ Folder created:', data.folder.name);
      
      setShowFolderModal(false);
      setNewFolderName("");
      setFolderError("");
      fetchData();
    } catch (err) {
      console.error('❌ Folder creation error:', err);
      setFolderError(err.message);
    }
  };

  // Create new document
  const createNewDocument = async () => {
    if (!newDocName.trim()) {
      setDocError("Document name is required");
      return;
    }
    try {
      const response = await fetch(getApiUrl('documents'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          title: newDocName,
          content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [] }] }),
          folder_id: folderId || null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        console.error('❌ Document creation failed:', response.status, errorData);
        throw new Error(errorData.message || `Failed to create document (${response.status})`);
      }
      
      const data = await response.json();
      console.log('✅ Document created:', data.document.title);
      
      setShowDocModal(false);
      setNewDocName("");
      setDocError("");
      fetchData();
      navigate(`/documents/${data.document.id}`);
    } catch (err) {
      console.error('❌ Document creation error:', err);
      setDocError(err.message);
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (item) => {
    try {
      const endpoint = item.type === 'document' 
        ? `${getApiUrl('documents')}/${item.id}/favorite`
        : `${getApiUrl('files')}/${item.id}/favorite`;
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle favorite');
      }
      
      const data = await response.json();
      
      // Update the local state
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file.id === item.id && file.type === item.type 
            ? { ...file, is_favorite: data.is_favorite }
            : file
        )
      );
      
      console.log(`✅ ${data.message}`);
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      setError('Failed to toggle favorite status');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (item) => {
    setDraggedItem(item);
  };
  const handleDragEnd = () => {
    setDraggedItem(null);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  const handleDrop = async (folder) => {
    if (!draggedItem) return;
    
    try {
  
      
      // Use the new unified move endpoint
      const endpoint = `${getApiUrl('move')}/${draggedItem.type}/${draggedItem.id || draggedItem._id}`;
      
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetFolderId: folder.id }),
      });
      
      const data = await res.json();
      
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to move item');
      }
      
      setDraggedItem(null);
      fetchData(); // Refresh the data to show the updated structure
      
      // Show success message
      
      
    } catch (err) {
      console.error('❌ Move failed:', err);
      alert(err.message || 'Move failed');
    }
  };

  // ShareModal state for ItemMenu integration  
  const [itemMenuShareModal, setItemMenuShareModal] = useState(false);
  const [itemMenuShareTarget, setItemMenuShareTarget] = useState(null);
  
  const openShareModal = (item) => {
    console.log('📤 Opening share modal for item:', item);
    setItemMenuShareTarget(item);
    setItemMenuShareModal(true);
  };

  const handleShowInfo = (item) => {
    setInfoItem(item);
    setShowInfoModal(true);
  };

  const handleDeleteItem = async (item) => {
    // Check if this is a shared item
    const isSharedItem = item.status && (item.status === 'Shared by you' || item.status === 'Shared with you');
    
    if (isSharedItem) {
      // For shared items, we need to remove the share, not delete the actual item
      const confirmMessage = item.status === 'Shared by you' 
        ? `Are you sure you want to remove the share for '${item.name}'? This will remove access for all users you shared it with.`
        : `Are you sure you want to remove '${item.name}' from your shared items? This will only remove it from your shared view.`;
      
      if (!window.confirm(confirmMessage)) return;
      
      try {
        // Remove the share relationship
        const res = await fetch(`${getApiUrl('shares')}/${item.type}/${item.id}/remove`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Failed to remove share for ${item.name}`);
        }
        
        // Refresh the data
        if (activeTab === 'shared-with-me') {
          fetchSharedItems();
        } else {
          fetchData();
        }
        setOpenMenuId(null);
      } catch (err) {
        console.error('Remove share error:', err);
        alert(err.message || 'Error removing share');
      }
      return;
    }
    
    // Regular item deletion (not shared)
    if (!window.confirm(`Are you sure you want to delete '${item.name}'? This cannot be undone.`)) return;
    let endpoint = '';
    if (item.type === 'document') endpoint = `${getApiUrl('documents')}/${item.id}`;
    else if (item.type === 'file') endpoint = `${getApiUrl('files')}/${item.id}`;
    else if (item.type === 'folder') endpoint = `${getApiUrl('folders')}/${item.id}`;
    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        // Parse the error response from the backend
        const errorData = await res.json();
        let errorMessage = `Failed to delete ${item.type}: ${item.name}`;
        
        // Handle specific folder deletion errors
        if (item.type === 'folder' && res.status === 400) {
          if (errorData.hasSubfolders) {
            errorMessage = `Cannot delete folder "${item.name}" - it contains subfolders. Please delete subfolders first.`;
          } else if (errorData.hasContent) {
            errorMessage = `Cannot delete folder "${item.name}" - it contains ${errorData.fileCount} files and ${errorData.documentCount} documents. Please move or delete them first.`;
          } else {
            errorMessage = errorData.message || errorMessage;
          }
        } else {
          errorMessage = errorData.message || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      fetchData();
      setOpenMenuId(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.message || 'Error deleting item');
    }
  };

  const handleDownloadItem = async (item) => {
    // Shared files: download via signed URL using s3Key; fallback for owned files
    try {
      // Files shared-with-me: use s3Key directly
      if (item.type === 'file' && item.s3Key) {
        // Use direct download endpoint
        const downloadUrl = `${getApiUrl('files')}/download?key=${encodeURIComponent(item.s3Key)}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = item.name || 'file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setOpenMenuId(null);
        return;
      }

      // Owned items or documents fallback
      const itemId = item.id || item._id || item.resourceId;
      if (!itemId) {
        alert('Item ID not found');
        return;
      }

      let endpoint = '';
      if (item.type === 'document') endpoint = `${getApiUrl('documents')}/${itemId}`;
      else if (item.type === 'file') endpoint = `${getApiUrl('files')}/${itemId}`;
      else return;

      const res = await fetch(endpoint, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      if (item.type === 'document') {
        const data = await res.json();
        // Infer extension from name or default to .txt
        let extension = '';
        if (item.name && item.name.includes('.')) {
          extension = item.name.substring(item.name.lastIndexOf('.'));
        } else {
          extension = '.txt';
        }
        const fileName = (item.name && item.name.includes('.')) ? item.name : (item.name || 'document') + extension;
        // Extract plain text from Tiptap/ProseMirror JSON
        const textContent = extractPlainTextFromTiptap(data.document.content) || JSON.stringify(data.document, null, 2);
        // Set MIME type based on extension
        let mimeType = 'text/plain';
        if (extension === '.doc' || extension === '.docx') {
          mimeType = 'application/msword';
        } else if (extension === '.pdf') {
          mimeType = 'application/pdf';
        }
        const blob = new Blob([textContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (item.type === 'file') {
        // Get file data from API response
        const data = await res.json();
        const fileName = data.file?.file_name || item.name || 'file';
        const s3Key = data.file?.s3Key;
        
        if (s3Key) {
          // Get signed URL for the file
          const signedUrlRes = await fetch(`${getApiUrl('files')}/signed-url?key=${encodeURIComponent(s3Key)}`, {
            headers: getAuthHeaders()
          });
          
          if (signedUrlRes.ok) {
            const signedUrlData = await signedUrlRes.json();
            const a = document.createElement('a');
            a.href = signedUrlData.url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } else {
            const errorData = await signedUrlRes.json().catch(() => ({}));
            console.error('Signed URL error:', signedUrlRes.status, errorData);
            
            if (signedUrlRes.status === 404) {
              alert('File not found in database. This file may have been deleted or corrupted.');
            } else if (signedUrlRes.status === 403) {
              alert('Access denied. You do not have permission to access this file.');
            } else {
              alert('Failed to get signed URL: ' + (errorData.message || signedUrlRes.status));
            }
          }
        } else {
          alert('File S3 key not found');
        }
      }
      setOpenMenuId(null);
    } catch (err) {
      console.error('Download error:', err);
      if (err.message === 'Failed to fetch') {
        alert('Error downloading item: File not found or access denied');
      } else {
        alert(`Error downloading item: ${err.message}`);
      }
    }
  };

  // Add extract handler
  const handleExtract = (item) => {
    if (!item || !item.id) return;
    // Default folder name: archive name without extension
    const baseName = item.name?.replace(/\.[^/.]+$/, "") || "Extracted";
    setExtractTarget(item);
    setExtractFolderName(baseName);
    setExtractError("");
    setShowExtractModal(true);
    
    // Show a brief notification
    const ext = item.name?.split('.').pop()?.toLowerCase();
    if (ext === 'zip' || ext === 'rar') {
      console.log(`📦 Opening extract modal for ${item.name}`);
    }
  };

  // Mass delete functionality

  const handleMassDelete = () => {
    if (selectedItems.length === 0) return;
    
    // Check if any folders are selected and warn user
    const folderCount = selectedItems.filter(item => item.type === 'folder').length;
    if (folderCount > 0) {
      console.log(`⚠️ Attempting to delete ${folderCount} folder(s) - some may contain files and cannot be deleted`);
    }
    
    setShowDeleteConfirmModal(true);
  };

  const confirmMassDelete = async () => {
    try {
      const results = [];
      
      // Process each item individually to handle errors properly
      for (const item of selectedItems) {
        const itemId = item._id || item.id;
        try {
          let response;
          if (item.type === 'document') {
            response = await fetch(`${getApiUrl('documents')}/${itemId}`, {
              method: 'DELETE',
              headers: getAuthHeaders()
            });
          } else if (item.type === 'file') {
            response = await fetch(`${getApiUrl('files')}/${itemId}`, {
              method: 'DELETE',
              headers: getAuthHeaders()
            });
          } else if (item.type === 'folder') {
            response = await fetch(`${getApiUrl('folders')}/${itemId}`, {
              method: 'DELETE',
              headers: getAuthHeaders()
            });
          }
          
          if (response.ok) {
            results.push({ item, success: true });
          } else {
            const errorData = await response.json();
            let errorMessage = `Failed to delete ${item.type}: ${item.name}`;
            
            // Handle specific folder deletion errors
            if (item.type === 'folder' && response.status === 400) {
              if (errorData.hasSubfolders) {
                errorMessage = `Cannot delete folder "${item.name}" - it contains subfolders. Please delete subfolders first.`;
              } else if (errorData.hasContent) {
                errorMessage = `Cannot delete folder "${item.name}" - it contains ${errorData.fileCount} files and ${errorData.documentCount} documents. Please move or delete them first.`;
              }
            }
            
            results.push({ item, success: false, error: errorMessage });
          }
        } catch (error) {
          results.push({ item, success: false, error: `Failed to delete ${item.type}: ${item.name} - ${error.message}` });
        }
      }
      
      // Count successes and failures
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Clear selection and refresh data
      setSelectedItems([]);
      setIsSelectionMode(false);
      setShowDeleteConfirmModal(false);
      fetchData();
      
      // Show results
      if (successful.length > 0 && failed.length === 0) {
        alert(`✅ Successfully deleted ${successful.length} item(s)`);
      } else if (successful.length > 0 && failed.length > 0) {
        const failedItems = failed.map(f => f.error).join('\n');
        alert(`⚠️ Partially completed:\n\n✅ Deleted: ${successful.length} item(s)\n❌ Failed: ${failed.length} item(s)\n\nFailed items:\n${failedItems}`);
      } else if (failed.length > 0) {
        const failedItems = failed.map(f => f.error).join('\n');
        alert(`❌ Failed to delete any items:\n\n${failedItems}`);
      }
      
    } catch (error) {
      console.error('Mass delete error:', error);
      alert(`Error during mass delete: ${error.message}`);
    }
  };

  // Handle viewing folder contents
  const handleViewFolderContents = async (folder) => {
    try {
      setFolderContentsLoading(true);
      setShowFolderContentsModal(true);
      
      const response = await fetch(`${getApiUrl('folders')}/${folder.id}/contents`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch folder contents');
      }
      
      const data = await response.json();
      setFolderContents(data);
    } catch (error) {
      console.error('Error fetching folder contents:', error);
      alert(`Error loading folder contents: ${error.message}`);
      setShowFolderContentsModal(false);
    } finally {
      setFolderContentsLoading(false);
    }
  };

  // Refresh file URLs (fix files with direct S3 URLs)
  const refreshFileUrls = async () => {
    try {
      const response = await fetch(`${getApiUrl('files')}/refresh-urls`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh file URLs');
      }
      
      const data = await response.json();
      alert(`✅ ${data.message}`);
      
      // Refresh data to show updated files
      await fetchData();
    } catch (error) {
      console.error('Error refreshing file URLs:', error);
      alert(`Error refreshing file URLs: ${error.message}`);
    }
  };

  const confirmExtract = async () => {
    if (!extractTarget || !extractTarget.id) return;
    if (!extractFolderName.trim()) {
      setExtractError("Folder name is required");
      return;
    }
    setExtractLoading(true);
    setExtractError("");
    
    let res = null;
    try {
      res = await fetch(`${getApiUrl('files')}/${extractTarget.id}/extract`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder_name: extractFolderName.trim() })
      });
      
      if (!res.ok) {
        // Try to get error details from response
        try {
          const errorData = await res.json();
          throw new Error(errorData.message || errorData.error || 'Failed to extract');
        } catch (parseError) {
          throw new Error('Failed to extract');
        }
      }
      
      const data = await res.json();
      console.log('✅ Extract successful:', data);
      setShowExtractModal(false);
      setExtractTarget(null);
      setExtractFolderName("");
      setExtractError("");
      
      // Show detailed success message
      const fileList = data.files?.map(f => `${f.file} (in ${f.folder})`).join(', ') || 'No files';
      alert(`✅ Extraction successful!\n\nExtracted files:\n${fileList}\n\nFiles have been saved to the "${data.folderName}" folder.`);
      
      // Navigate to the extracted folder to show the files
      if (data.folderId) {
        // Small delay to ensure folder is properly created
        setTimeout(() => {
          navigate(`/folder/${data.folderId}`);
        }, 500);
      } else {
        // Fallback: refresh data in current location
        await fetchData();
      }
    } catch (err) {
      console.error('❌ Extract error:', err);
      
      // Provide user-friendly error messages
      let errorMessage = 'Extract failed: ' + err.message;
      
      if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Extract failed: Unable to connect to server. Please check your internet connection and try again.';
      } else if (err.message.includes('ZIP extraction failed')) {
        errorMessage = 'The ZIP file appears to be corrupted or invalid. Please try uploading a different ZIP file.';
      } else if (err.message.includes('File not found in S3')) {
        errorMessage = 'This file was uploaded before S3 integration and cannot be extracted. Please re-upload the file.';
      } else if (err.message.includes('Not a zip or rar file')) {
        errorMessage = 'This file is not a valid ZIP or RAR archive. Please select a different file.';
      }
      
      setExtractError(errorMessage);
    } finally {
      setExtractLoading(false);
    }
  };

  // Helper to get mono-color, type-specific icon
  const getFileIcon = (item) => {
    if (item.type === 'folder') return <FaFolder className="text-yellow-500 text-lg" />;
    const ext = item.name?.split('.').pop()?.toLowerCase() || '';
    if (['zip','rar'].includes(ext)) {
      return (
        <div className="relative">
          <FaFileArchive className="text-purple-600 text-lg" />
          <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            <span className="text-[10px]">E</span>
          </div>
        </div>
      );
    }
    if (['pdf'].includes(ext)) return <FaFilePdf className="text-red-500 text-lg" />;
    if (['jpg','jpeg','png','gif','bmp','webp','svg'].includes(ext)) return <FaFileImage className="text-blue-500 text-lg" />;
    if (['mp4','webm','ogg','mkv'].includes(ext)) return <FaFileVideo className="text-pink-500 text-lg" />;
    if (['doc','docx'].includes(ext)) return <FaFileWord className="text-blue-700 text-lg" />;
    if (['xls','xlsx'].includes(ext)) return <FaFileExcel className="text-green-600 text-lg" />;
    return <FaFile className="text-gray-500 text-lg" />;
  };

  // Helper to get file hover text
  const getFileHoverText = (item) => {
    if (item.type === 'folder') return 'Open folder';
    const ext = item.name?.split('.').pop()?.toLowerCase() || '';
    if (['zip','rar'].includes(ext)) return 'Click to extract archive';
    if (['pdf'].includes(ext)) return 'Preview PDF';
    if (['jpg','jpeg','png','gif','bmp','webp','svg'].includes(ext)) return 'Preview image';
    if (['mp4','webm','ogg','mkv'].includes(ext)) return 'Preview video';
    return 'Download file';
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
      {/* Breadcrumb Navigation */}
      <Breadcrumb folderId={folderId} />
      
      {/* Search Bar */}
      <div className="mb-4 flex items-center justify-between">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search files, folders, or documents..."
          className="w-full max-w-xs px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm"
          style={{ minWidth: 220 }}
        />
        <div className="flex space-x-2">
          <button
            onClick={fetchData}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors flex items-center"
            title="Refresh data"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={refreshFileUrls}
            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors flex items-center"
            title="Fix file URLs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </button>
        </div>
      </div>
      {/* Tabs and actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'tab-clear-active' : 'tab-clear-inactive'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          <div className="relative" ref={plusMenuRef}>
            <button
              className="ml-2 btn btn-secondary btn-lg text-lg flex items-center"
              onClick={() => setShowPlusMenu(v => !v)}
            >
              <FaPlus className="text-[#0078d4]" />
            </button>
            {showPlusMenu && (
              <div className="absolute left-0 mt-2 w-56 menu-panel">
                <button className="menu-item" onClick={() => handlePlusMenu('new-doc')}><FaPlus className="menu-item-icon" />New Document</button>
                <button className="menu-item" onClick={() => handlePlusMenu('new-folder')}><FaPlus className="menu-item-icon" />New Folder</button>
                <button className="menu-item" onClick={() => handlePlusMenu('upload')}><FaUpload className="menu-item-icon" />Upload File</button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Selection Mode Controls */}
          {isSelectionMode && (
            <div className="flex items-center space-x-2 mr-4">
              <button
                onClick={selectAllItems}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={deselectAllItems}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Deselect All
              </button>
              <span className="text-sm text-gray-600">
                {selectedItems.length} selected
              </span>
              <button
                onClick={handleMassDelete}
                disabled={selectedItems.length === 0}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <FaTrash className="mr-1" />
                Delete ({selectedItems.length})
              </button>
            </div>
          )}
          
          <button 
            className={`btn btn-secondary btn-lg ${isSelectionMode ? 'bg-blue-100 border-blue-500 text-blue-700' : ''}`} 
            title="Selection mode" 
            onClick={toggleSelectionMode}
          >
            <FaCheckSquare className="text-[#0078d4]" />
          </button>
          <button className="btn btn-primary btn-lg" title="Upload" onClick={() => navigate('/upload')}>
            <FaUpload className="text-white" />
          </button>
          <button 
            className="btn btn-secondary btn-lg" 
            title="Keyboard Shortcuts (Ctrl + ?)" 
            onClick={() => setShowShortcutsHelp(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button className={`btn btn-secondary btn-lg ${viewStyle === 'list' ? 'bg-[#e5f1fb] border-[#0078d4] text-[#0078d4]' : ''}`} title="List view" onClick={() => setViewStyle('list')}>
            <FaThList className="text-[#0078d4]" />
          </button>
          <button className={`btn btn-secondary btn-lg ${viewStyle === 'grid' ? 'bg-[#e5f1fb] border-[#0078d4] text-[#0078d4]' : ''}`} title="Grid view" onClick={() => setViewStyle('grid')}>
            <FaThLarge className="text-[#0078d4]" />
          </button>
        </div>
      </div>

      {/* Drag & Drop Upload Area - Show when folder is empty or at root */}
      {(listData.length === 0 || !folderId) && (
        <div className="mb-6">
          <DragDropUpload 
            onUpload={fetchData}
            currentFolderId={folderId}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Simple Microsoft-style List */}
      {viewStyle === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="py-12">
              <LoadingSpinner 
                size="lg" 
                text="Loading your files and folders..." 
                className="flex-col"
              />
            </div>
          ) : error ? (
            <div className="py-8">
              <ErrorMessage
                type="error"
                title="Failed to load items"
                message={error}
                onRetry={fetchData}
                className="mx-4"
              />
            </div>
          ) : listData.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-gray-400 dark:text-gray-500">
                <FaFolder className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2 text-gray-600 dark:text-gray-300">
                  {folderId ? 'This folder is empty' : 'No items found'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {folderId ? 
                    'Upload files or create subfolders to get started' : 
                    'Get started by uploading files or creating folders'
                  }
                </p>
                {folderId && (
                  <button
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Refresh Folder
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-100">
                <div>Name</div>
                <div>Date</div>
                <div>Status</div>
                <div className="text-right">Actions</div>
              </div>
              
              {/* Items */}
              {listData.map(item => (
                <div
                  key={item.shareId ? `${item.shareId}-${item._id || item.id}` : item._id || item.id}
                  className={`grid grid-cols-4 gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${draggedItem && draggedItem._id === (item._id || item.id) ? 'opacity-50' : ''} ${isItemSelected(item) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  onClick={() => handleRowClick(item)}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {getFileIcon(item)}
                    <span className="font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                    {item.is_favorite && (
                      <FaStar className="text-yellow-500 w-4 h-4 flex-shrink-0" title="Favorite" />
                    )}
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    {item.date ? new Date(item.date).toLocaleDateString() : 'No date'}
                  </div>
                  <div className="flex items-center text-gray-500 dark:text-gray-300">
                    {item.status || 'Active'}
                  </div>
                  <div className="flex items-center justify-end space-x-2">
                    {(item.type === 'file' || item.type === 'document') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item);
                        }}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        title={item.is_favorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        {item.is_favorite ? (
                          <FaStar className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <FaRegStar className="w-4 h-4 text-gray-400 hover:text-yellow-500" />
                        )}
                      </button>
                    )}
                    <ItemMenu
                      item={item}
                      onShare={openShareModal}
                      onDownload={handleDownloadItem}
                      onInfo={handleShowInfo}
                      onDelete={handleDeleteItem}
                      onExtract={handleExtract}
                      onViewContents={handleViewFolderContents}
                      onFavorite={toggleFavorite}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 p-6 card">
          {isLoading ? (
            <div className="col-span-full py-12">
              <LoadingSpinner 
                size="lg" 
                text="Loading your files and folders..." 
                className="flex-col"
              />
            </div>
          ) : error ? (
            <div className="col-span-full py-8">
              <ErrorMessage
                type="error"
                title="Failed to load items"
                message={error}
                onRetry={fetchData}
                className="max-w-md mx-auto"
              />
            </div>
          ) : listData.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <div className="text-gray-400 dark:text-gray-500">
                <FaFolder className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2 text-gray-600 dark:text-gray-300">
                  {folderId ? 'This folder is empty' : 'No items found'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {folderId ? 
                    'Upload files or create subfolders to get started' : 
                    'Get started by uploading files or creating folders'
                  }
                </p>
                {folderId && (
                  <button
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Refresh Folder
                  </button>
                )}
              </div>
            </div>
          ) : (
            listData.map(item => (
              item.type === 'folder' ? (
                <FolderCard
                  key={item.shareId ? `${item.shareId}-${item._id || item.id}` : item._id || item.id}
                  title={item.name}
                  items={item.items || 0}
                  fileCount={item.fileCount || 0}
                  documentCount={item.documentCount || 0}
                  subfolderCount={item.subfolderCount || 0}
                  lastModified={item.date ? new Date(item.date).toLocaleDateString() : ''}
                  onClick={() => handleRowClick(item)}
                  className={`${draggedItem && draggedItem._id === (item._id || item.id) ? 'opacity-50' : ''}`}
                  draggable={true}
                  onDragStart={() => handleDragStart(item)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => { e.stopPropagation(); handleDrop(item); }}
                  item={item}
                  onShare={openShareModal}
                  onDownload={handleDownloadItem}
                  onInfo={handleShowInfo}
                  onDelete={handleDeleteItem}
                  onExtract={handleExtract}
                  onViewContents={handleViewFolderContents}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                />
              ) : (
                <CustomTooltip key={item._id || item.id} content={getFileHoverText(item)}>
                  <div
                    className={`relative flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow cursor-pointer transition ${draggedItem && draggedItem._id === (item._id || item.id) ? 'opacity-50' : ''} ${isItemSelected(item) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''}`}
                    onClick={() => handleRowClick(item)}
                    draggable={true}
                    onDragStart={() => handleDragStart(item)}
                    onDragEnd={handleDragEnd}
                    onDragOver={item.type === 'folder' ? handleDragOver : undefined}
                    onDrop={item.type === 'folder' ? (e) => { e.stopPropagation(); handleDrop(item); } : undefined}
                  >
                  {isSelectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItemSelection(item);
                        }}
                        className="flex items-center justify-center w-5 h-5 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 shadow-sm"
                      >
                        {isItemSelected(item) ? (
                          <FaCheckSquare className="text-blue-600 text-sm" />
                        ) : (
                          <FaSquare className="text-gray-400 text-sm" />
                        )}
                      </button>
                    </div>
                  )}
                  <div className="mb-2">
                    {getFileIcon(item)}
                  </div>
                  <div className="font-medium text-center truncate w-full text-gray-900 dark:text-gray-100 flex items-center justify-center space-x-1" title={item.name}>
                    <span className="truncate">{item.name}</span>
                    {item.is_favorite && (
                      <FaStar className="text-yellow-500 w-3 h-3 flex-shrink-0" title="Favorite" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.date ? new Date(item.date).toLocaleDateString() : ''}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{item.status}</div>
                  <div className="absolute top-2 right-2 flex items-center space-x-1">
                    {(item.type === 'file' || item.type === 'document') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item);
                        }}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors bg-white dark:bg-gray-800 shadow-sm"
                        title={item.is_favorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        {item.is_favorite ? (
                          <FaStar className="w-3 h-3 text-yellow-500" />
                        ) : (
                          <FaRegStar className="w-3 h-3 text-gray-400 hover:text-yellow-500" />
                        )}
                      </button>
                    )}
                    <ItemMenu
                      item={item}
                      onShare={openShareModal}
                      onDownload={handleDownloadItem}
                      onInfo={handleShowInfo}
                      onDelete={handleDeleteItem}
                      onExtract={handleExtract}
                      onViewContents={handleViewFolderContents}
                      onFavorite={toggleFavorite}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                    />
                  </div>
                </div>
                </CustomTooltip>
              )
            ))
          )}
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 transition-colors duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Create New Folder</h2>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Folder name</label>
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm transition-colors duration-200"
              autoFocus
            />
            {folderError && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{folderError}</p>}
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowFolderModal(false); setNewFolderName(""); setFolderError(""); }} className="btn btn-secondary">Cancel</button>
              <button onClick={createNewFolder} className="btn btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* New Document Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 transition-colors duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Create New Document</h2>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Document name</label>
            <input
              type="text"
              value={newDocName}
              onChange={e => setNewDocName(e.target.value)}
              placeholder="Document name"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm transition-colors duration-200"
              autoFocus
            />
            {docError && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{docError}</p>}
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowDocModal(false); setNewDocName(""); setDocError(""); }} className="btn btn-secondary">Cancel</button>
              <button onClick={createNewDocument} className="btn btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Old Share Modal removed - using FileCard ShareModal instead */}

      {/* ShareModal for ItemMenu integration (list view sharing) */}
      {itemMenuShareModal && itemMenuShareTarget && (
        <ShareModal
          isOpen={itemMenuShareModal}
          onClose={() => {
            setItemMenuShareModal(false);
            setItemMenuShareTarget(null);
          }}
          resourceType={itemMenuShareTarget.type === 'document' ? 'document' : 'file'}
          resourceId={itemMenuShareTarget.id}
          resourceName={itemMenuShareTarget.name || itemMenuShareTarget.title || itemMenuShareTarget.filename}
          onShareSuccess={() => {
            setItemMenuShareModal(false);
            setItemMenuShareTarget(null);
            console.log('✅ Share successful from ItemMenu');
            // Refresh shared items if we're on that tab
            if (activeTab === 'shared-with-me') {
              fetchSharedItems();
            }
          }}
        />
      )}

      {/* PDF Preview Modal */}
      {showPDFModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl max-h-full w-full h-full flex flex-col">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">PDF Preview</h3>
              <button
                onClick={() => setShowPDFModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {pdfUrl && (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full min-h-96"
                  title="PDF Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl max-h-full w-full flex flex-col">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Video Preview</h3>
              <button
                onClick={() => setShowVideoModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4">
              {videoUrl && (
                <video
                  controls
                  className="w-full max-h-96"
                  preload="metadata"
                >
                  <source src={videoUrl} type={videoType} />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Home;