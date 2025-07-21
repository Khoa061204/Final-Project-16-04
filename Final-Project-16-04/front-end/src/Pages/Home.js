import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuthHeaders } from '../utils/auth';
import { AuthContext } from "../App";
import { FaFolder, FaFileAlt, FaPlus, FaUpload, FaThList, FaThLarge, FaEllipsisV, FaShareAlt, FaFileArchive, FaFilePdf, FaFileImage, FaFileVideo, FaFileWord, FaFileExcel, FaFile, FaStar, FaRegStar } from 'react-icons/fa';
import { Menu, Transition } from '@headlessui/react';
import ItemMenu from '../components/ItemMenu';
import { Document as PDFDocument, Page as PDFPage, pdfjs } from 'react-pdf';
import 'pdfjs-dist/web/pdf_viewer.css';

// Set the workerSrc after all imports
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const DOCUMENTS_ENDPOINT = `${API_BASE_URL}/documents`;
const FILES_ENDPOINT = `${API_BASE_URL}/files`;
const FOLDERS_ENDPOINT = `${API_BASE_URL}/folders`;

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'recent', label: 'Recently opened' },
  { id: 'shared', label: 'Shared' },
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

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTarget, setShareTarget] = useState(null); // file or document to share
  const [shareEmails, setShareEmails] = useState('');
  const [shareError, setShareError] = useState('');
  const [sharedItems, setSharedItems] = useState({ files: [], documents: [] });
  const [shareTab, setShareTab] = useState('team'); // 'team' or 'email'
  const [selectedTeamUsers, setSelectedTeamUsers] = useState([]); // user IDs
  const [teamUsers, setTeamUsers] = useState([]);

  // Add state for selected teams
  const [selectedTeams, setSelectedTeams] = useState([]);

  // Add state for info modal
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoItem, setInfoItem] = useState(null);

  // Add state for openMenuId
  const [openMenuId, setOpenMenuId] = useState(null);

  // PDF Preview Modal state
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  // Add state for image and video preview modals
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Add state for extract modal
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractTarget, setExtractTarget] = useState(null);
  const [extractFolderName, setExtractFolderName] = useState("");
  const [extractError, setExtractError] = useState("");

  // Use teams from prop or context
  const teams = propTeams || [];

  useEffect(() => {
    if (isAuthenticated) {
      console.log('Current folderId from URL:', folderId);
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

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch folders
      const folderUrl = folderId ? 
        `${FOLDERS_ENDPOINT}?parent_id=${folderId}` : 
        FOLDERS_ENDPOINT;
      const folderRes = await fetch(folderUrl, { headers: getAuthHeaders() });
      if (!folderRes.ok) throw new Error('Failed to fetch folders');
      const folderData = await folderRes.json();
      setFolders(folderData.folders || []);

      // Fetch files
      const params = folderId ? 
        `?folder_id=${folderId}` : 
        '?root=true';
      const filesRes = await fetch(`${FILES_ENDPOINT}${params}`, { headers: getAuthHeaders() });
      if (!filesRes.ok) throw new Error('Failed to fetch files');
      const filesData = await filesRes.json();

      // Fetch documents
      const documentsRes = await fetch(`${DOCUMENTS_ENDPOINT}${params}`, { headers: getAuthHeaders() });
      if (!documentsRes.ok) throw new Error('Failed to fetch documents');
      const documentsData = await documentsRes.json();

      // Combine files and documents
      const allFiles = [
        ...(documentsData.documents || []).map(doc => ({
          ...doc,
          type: 'document',
          name: doc.title || 'Untitled Document',
          date: doc.updatedAt || doc.createdAt,
          status: 'You edited this',
        })),
        ...(filesData.files || []).map(file => ({
          ...file,
          type: 'file',
          name: file.file_name || 'Untitled File',
          date: file.uploaded_at || file.createdAt,
          status: '',
        }))
      ];
      console.log('Fetched files:', allFiles.map(f => ({id: f._id || f.id, folder_id: f.folder_id, name: f.name})));
      setFiles(allFiles);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show folders whose parent_id matches the current folder
  const filteredFolders = folders.filter(folder => {
    if (!folderId) return !folder.parent_id;
    return folder.parent_id === folderId;
  });

  // Only show files/documents for the current folder (strict equality)
  const filteredFiles = files.filter(item => {
    if (!folderId) {
      const result = !item.folder_id;
      if (!result) console.log('Filtered out (root):', item.name, 'folder_id:', item.folder_id);
      return result;
    }
    const result = String(item.folder_id) === String(folderId);
    if (result) {
      console.log('File in folder:', item.name, 'folder_id:', item.folder_id, 'matches', folderId);
    } else {
      console.log('Filtered out (not in folder):', item.name, 'folder_id:', item.folder_id, '!=', folderId);
    }
    return result;
  });

  // Fetch shared items for Shared tab
  useEffect(() => {
    if (activeTab === 'shared' && isAuthenticated) {
      fetchSharedItems();
    }
  }, [activeTab, isAuthenticated]);
  const fetchSharedItems = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/shared`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch shared items');
      const data = await res.json();
      setSharedItems(data);
    } catch (err) {
      setSharedItems({ files: [], documents: [] });
    }
  };

  // Fetch team users for sharing
  useEffect(() => {
    if (showShareModal && shareTab === 'team') {
      fetchTeamUsers();
    }
  }, [showShareModal, shareTab]);
  const fetchTeamUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams`, { headers: getAuthHeaders() });
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

  // Tab filtering
  const getListData = () => {
    if (activeTab === 'shared') {
      // Only show documents shared with you (not owned by you)
      return [
        ...(sharedItems.documents || [])
          .filter(doc => doc.userId !== user?.id)
          .map(doc => ({
            ...doc,
            type: 'document',
            name: doc.title || 'Untitled Document',
            date: doc.updatedAt || doc.createdAt,
            status: 'Shared with you',
          })),
        ...(sharedItems.files || []).map(file => ({
          ...file,
          type: 'file',
          name: file.file_name || 'Untitled File',
          date: file.uploaded_at || file.createdAt,
          status: 'Shared with you',
        }))
      ];
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
    if (item.type === 'folder') {
      navigate(`/folders/${item.id}`);
    } else if (item.type === 'document') {
      navigate(`/documents/${item.id}`);
    } else if (item.type === 'file' && item.file_url) {
      const ext = item.name?.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') {
        if (!item.s3Key) {
          console.error('Missing s3Key for item:', item);
          alert('This file is missing a valid S3 key and cannot be previewed.');
          return;
        }
        try {
          // Fetch signed URL from backend
          const res = await fetch(`${API_BASE_URL}/files/signed-url?key=${encodeURIComponent(item.s3Key)}`, { headers: getAuthHeaders() });
          if (!res.ok) {
            alert('Failed to get signed URL: ' + res.status);
            return;
          }
          const data = await res.json();
          setPdfUrl(data.url);
          setShowPDFModal(true);
        } catch (err) {
          alert('Failed to load PDF for preview: ' + err);
        }
      } else if (["jpg","jpeg","png","gif","bmp","webp","svg"].includes(ext)) {
        setImageUrl(item.file_url);
        setShowImageModal(true);
      } else if (["mp4","webm","ogg","mkv"].includes(ext)) {
        setVideoUrl(item.file_url);
        setShowVideoModal(true);
      } else {
        window.open(item.file_url, '_blank');
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
      const response = await fetch(FOLDERS_ENDPOINT, {
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
      if (!response.ok) throw new Error('Failed to create folder');
      setShowFolderModal(false);
      setNewFolderName("");
      setFolderError("");
      fetchData();
    } catch (err) {
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
      const response = await fetch(DOCUMENTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          title: newDocName,
          content: { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
          folder_id: folderId || null
        })
      });
      if (!response.ok) throw new Error('Failed to create document');
      const data = await response.json();
      setShowDocModal(false);
      setNewDocName("");
      setDocError("");
      fetchData();
      navigate(`/documents/${data.document.id}`);
    } catch (err) {
      setDocError(err.message);
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
      let endpoint = '';
      let method = 'PUT';
      let body = {};
      if (draggedItem.type === 'document') {
        endpoint = `${DOCUMENTS_ENDPOINT}/${draggedItem.id}/move`;
        body = { folder_id: folder.id };
      } else if (draggedItem.type === 'file') {
        endpoint = `${FILES_ENDPOINT}/${draggedItem._id || draggedItem.id}`;
        body = { folder_id: folder.id };
      }
      const res = await fetch(endpoint, {
        method,
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log('Move response:', data);
      if (!res.ok) throw new Error('Failed to move item');
      setDraggedItem(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Move failed');
    }
  };

  // Share modal logic
  const openShareModal = (item) => {
    setShareTarget(item);
    setShareEmails('');
    setShareError('');
    setShowShareModal(true);
  };
  const handleShare = async () => {
    if (!shareTarget) return;
    const emails = shareEmails.split(',').map(e => e.trim()).filter(Boolean);
    const userIds = selectedTeamUsers;
    const teamIds = selectedTeams;
    if (emails.length === 0 && userIds.length === 0 && teamIds.length === 0) {
      setShareError('Please select at least one team, team member, or enter at least one email.');
      return;
    }
    try {
      const endpoint = shareTarget.type === 'document'
        ? `${DOCUMENTS_ENDPOINT}/${shareTarget.id}/share`
        : `${FILES_ENDPOINT}/${shareTarget._id || shareTarget.id}/share`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, userIds, teamIds })
      });
      if (!res.ok) throw new Error('Failed to share');
      setShowShareModal(false);
      setShareTarget(null);
      setShareEmails('');
      setSelectedTeamUsers([]);
      setSelectedTeams([]);
      setShareError('');
      if (activeTab === 'shared') fetchSharedItems();
    } catch (err) {
      setShareError(err.message);
    }
  };

  const handleShowInfo = (item) => {
    setInfoItem(item);
    setShowInfoModal(true);
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete '${item.name}'? This cannot be undone.`)) return;
    let endpoint = '';
    if (item.type === 'document') endpoint = `${DOCUMENTS_ENDPOINT}/${item.id}`;
    else if (item.type === 'file') endpoint = `${FILES_ENDPOINT}/${item.id}`;
    else if (item.type === 'folder') endpoint = `${FOLDERS_ENDPOINT}/${item.id}`;
    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchData();
      setOpenMenuId(null);
    } catch (err) {
      alert('Error deleting item');
    }
  };

  const handleDownloadItem = async (item) => {
    let endpoint = '';
    if (item.type === 'document') endpoint = `${DOCUMENTS_ENDPOINT}/${item.id}`;
    else if (item.type === 'file') endpoint = `${FILES_ENDPOINT}/${item.id}`;
    else return;
    try {
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
        // Try to get file_url and file_name from API response or item
        const data = await res.json();
        const fileUrl = data.file?.file_url || item.file_url;
        const fileName = data.file?.file_name || item.name || 'file';
        if (fileUrl) {
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          alert('File URL not found');
        }
      }
      setOpenMenuId(null);
    } catch (err) {
      alert('Error downloading item');
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
  };

  const confirmExtract = async () => {
    if (!extractTarget || !extractTarget.id) return;
    if (!extractFolderName.trim()) {
      setExtractError("Folder name is required");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/files/${extractTarget.id}/extract`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder_name: extractFolderName.trim() })
      });
      if (!res.ok) throw new Error('Failed to extract');
      const data = await res.json();
      setShowExtractModal(false);
      setExtractTarget(null);
      setExtractFolderName("");
      setExtractError("");
      alert('Extracted! Files: ' + (data.files?.map(f => f.file).join(', ') || ''));
      fetchData();
    } catch (err) {
      setExtractError('Extract failed: ' + err.message);
    }
  };

  // Helper to get mono-color, type-specific icon
  const getFileIcon = (item) => {
    if (item.type === 'folder') return <FaFolder className="text-yellow-500 text-lg" />;
    const ext = item.name?.split('.').pop()?.toLowerCase() || '';
    if (['zip','rar'].includes(ext)) return <FaFileArchive className="text-purple-600 text-lg" />;
    if (['pdf'].includes(ext)) return <FaFilePdf className="text-red-500 text-lg" />;
    if (['jpg','jpeg','png','gif','bmp','webp','svg'].includes(ext)) return <FaFileImage className="text-blue-500 text-lg" />;
    if (['mp4','webm','ogg','mkv'].includes(ext)) return <FaFileVideo className="text-pink-500 text-lg" />;
    if (['doc','docx'].includes(ext)) return <FaFileWord className="text-blue-700 text-lg" />;
    if (['xls','xlsx'].includes(ext)) return <FaFileExcel className="text-green-600 text-lg" />;
    return <FaFile className="text-gray-500 text-lg" />;
  };

  return (
    <div className="p-6">
      {/* Search Bar */}
      <div className="mb-4 flex items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search files, folders, or documents..."
          className="w-full max-w-xs px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 shadow-sm"
          style={{ minWidth: 220 }}
        />
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
          <button className="btn btn-primary btn-lg" title="Upload" onClick={() => navigate('/upload')}>
            <FaUpload className="text-white" />
          </button>
          <button className={`btn btn-secondary btn-lg ${viewStyle === 'list' ? 'bg-[#e5f1fb] border-[#0078d4] text-[#0078d4]' : ''}`} title="List view" onClick={() => setViewStyle('list')}>
            <FaThList className="text-[#0078d4]" />
          </button>
          <button className={`btn btn-secondary btn-lg ${viewStyle === 'grid' ? 'bg-[#e5f1fb] border-[#0078d4] text-[#0078d4]' : ''}`} title="Grid view" onClick={() => setViewStyle('grid')}>
            <FaThLarge className="text-[#0078d4]" />
          </button>
        </div>
      </div>

      {/* Table/List or Grid */}
      {viewStyle === 'list' ? (
        <div className="bg-white rounded-lg shadow border border-gray-100 overflow-x-auto card">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="py-3 px-4 text-left font-normal"> </th>
                <th className="py-3 px-4 text-left font-normal">Name</th>
                <th className="py-3 px-4 text-left font-normal">Date</th>
                <th className="py-3 px-4 text-left font-normal">Status</th>
                <th className="py-3 px-4 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="py-8 text-center">Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={4} className="py-8 text-center text-red-500">{error}</td></tr>
              ) : listData.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400">No items found.</td></tr>
              ) : (
                listData.map(item => (
                  <tr
                    key={item._id || item.id}
                    className={`hover:bg-gray-50 cursor-pointer border-b ${draggedItem && draggedItem._id === (item._id || item.id) ? 'opacity-50' : ''}`}
                    onClick={() => handleRowClick(item)}
                    draggable={item.type === 'file' || item.type === 'document'}
                    onDragStart={item.type === 'file' || item.type === 'document' ? () => handleDragStart(item) : undefined}
                    onDragEnd={item.type === 'file' || item.type === 'document' ? handleDragEnd : undefined}
                    onDragOver={item.type === 'folder' ? handleDragOver : undefined}
                    onDrop={item.type === 'folder' ? (e) => { e.stopPropagation(); handleDrop(item); } : undefined}
                  >
                    <td className="py-3 px-4">
                      {getFileIcon(item)}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                    <td className="py-3 px-4">{item.date ? new Date(item.date).toLocaleDateString() : ''}</td>
                    <td className="py-3 px-4 text-gray-500">{item.status}</td>
                    <td className="py-3 px-4 text-right">
                      <ItemMenu
                        item={item}
                        onShare={openShareModal}
                        onDownload={handleDownloadItem}
                        onInfo={handleShowInfo}
                        onDelete={handleDeleteItem}
                        onExtract={handleExtract}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 bg-white rounded-lg shadow border border-gray-100 p-6 card">
          {isLoading ? (
            <div className="col-span-full text-center py-8">Loading...</div>
          ) : error ? (
            <div className="col-span-full text-center text-red-500 py-8">{error}</div>
          ) : listData.length === 0 ? (
            <div className="col-span-full text-center text-gray-400 py-8">No items found.</div>
          ) : (
            listData.map(item => (
              <div
                key={item._id || item.id}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border hover:shadow cursor-pointer transition ${draggedItem && draggedItem._id === (item._id || item.id) ? 'opacity-50' : ''}`}
                onClick={() => handleRowClick(item)}
                draggable={item.type === 'file' || item.type === 'document'}
                onDragStart={item.type === 'file' || item.type === 'document' ? () => handleDragStart(item) : undefined}
                onDragEnd={item.type === 'file' || item.type === 'document' ? handleDragEnd : undefined}
                onDragOver={item.type === 'folder' ? handleDragOver : undefined}
                onDrop={item.type === 'folder' ? (e) => { e.stopPropagation(); handleDrop(item); } : undefined}
              >
                <div className="mb-2">
                  {getFileIcon(item)}
                </div>
                <div className="font-medium text-center truncate w-full text-gray-900" title={item.name}>{item.name}</div>
                <div className="text-xs text-gray-500 mt-1">{item.date ? new Date(item.date).toLocaleDateString() : ''}</div>
                <div className="text-xs text-gray-400 mt-1">{item.status}</div>
                <div className="text-right">
                  <ItemMenu
                    item={item}
                    onShare={openShareModal}
                    onDownload={handleDownloadItem}
                    onInfo={handleShowInfo}
                    onDelete={handleDeleteItem}
                    onExtract={handleExtract}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96 shadow-lg">
            <h2 className="text-lg font-medium mb-4 text-gray-900">Create New Folder</h2>
            <label className="block text-sm font-medium mb-1 text-gray-700">Folder name</label>
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500 shadow-sm"
              autoFocus
            />
            {folderError && <p className="text-sm text-red-600 mt-2">{folderError}</p>}
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowFolderModal(false); setNewFolderName(""); setFolderError(""); }} className="btn btn-secondary">Cancel</button>
              <button onClick={createNewFolder} className="btn btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* New Document Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96 shadow-lg">
            <h2 className="text-lg font-medium mb-4 text-gray-900">Create New Document</h2>
            <label className="block text-sm font-medium mb-1 text-gray-700">Document name</label>
            <input
              type="text"
              value={newDocName}
              onChange={e => setNewDocName(e.target.value)}
              placeholder="Document name"
              className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500 shadow-sm"
              autoFocus
            />
            {docError && <p className="text-sm text-red-600 mt-2">{docError}</p>}
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowDocModal(false); setNewDocName(""); setDocError(""); }} className="btn btn-secondary">Cancel</button>
              <button onClick={createNewDocument} className="btn btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96 shadow-lg">
            <h2 className="text-lg font-medium mb-4">Share {shareTarget?.name}</h2>
            <div className="flex space-x-2 mb-4">
              <button className={`px-3 py-1 rounded ${shareTab==='team'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`} onClick={()=>setShareTab('team')}>Team</button>
              <button className={`px-3 py-1 rounded ${shareTab==='email'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`} onClick={()=>setShareTab('email')}>Email</button>
            </div>
            {shareTab==='team' ? (
              <div className="mb-4 max-h-40 overflow-y-auto">
                {/* Team selection */}
                {teams.length === 0 ? <div className="text-gray-400 text-sm">No teams found.</div> : (
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 mb-1">Share with entire team:</div>
                    {teams.map(team => (
                      <label key={team.id} className="flex items-center space-x-2 mb-1">
                        <input type="checkbox" checked={selectedTeams.includes(team.id)} onChange={e => setSelectedTeams(v => e.target.checked ? [...v, team.id] : v.filter(id => id !== team.id))} />
                        <span className="font-semibold text-blue-700">{team.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {/* Individual member selection (as before) */}
                {teamUsers.length === 0 ? <div className="text-gray-400 text-sm">No team members found.</div> : teamUsers.map(u => (
                  <label key={u.id} className="flex items-center space-x-2 mb-1">
                    <input type="checkbox" checked={selectedTeamUsers.includes(u.id)} onChange={e => setSelectedTeamUsers(v => e.target.checked ? [...v, u.id] : v.filter(id => id !== u.id))} />
                    <span>{u.name || u.username || u.email}</span>
                  </label>
                ))}
              </div>
            ) : (
              <input type="text" value={shareEmails} onChange={e => setShareEmails(e.target.value)} placeholder="Enter emails, comma separated" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
            )}
            {shareError && <p className="text-sm text-red-600 mt-2">{shareError}</p>}
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowShareModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">Cancel</button>
              <button onClick={handleShare} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Share</button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && infoItem && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96 shadow-lg">
            <h2 className="text-lg font-medium mb-4">Item Info</h2>
            <div className="mb-4">
              <div><b>Name:</b> {infoItem.name}</div>
              <div><b>Type:</b> {infoItem.type}</div>
              {infoItem.date && <div><b>Date:</b> {new Date(infoItem.date).toLocaleString()}</div>}
              {infoItem.size && <div><b>Size:</b> {infoItem.size} bytes</div>}
              {infoItem.owner && <div><b>Owner:</b> {infoItem.owner}</div>}
              {infoItem.status && <div><b>Status:</b> {infoItem.status}</div>}
              {infoItem.file_url && <div><b>File URL:</b> <a href={infoItem.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open</a></div>}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowInfoModal(false)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPDFModal && (
        <PDFPreviewModal
          fileUrl={pdfUrl}
          onClose={() => setShowPDFModal(false)}
        />
      )}
      {/* Extract Modal */}
      {showExtractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96 shadow-lg">
            <h2 className="text-lg font-medium mb-4 text-gray-900">Extract Archive</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700">Folder name</label>
              <input
                type="text"
                value={extractFolderName}
                onChange={e => setExtractFolderName(e.target.value)}
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500 shadow-sm"
                autoFocus
              />
              {extractError && <p className="text-sm text-red-600 mt-2">{extractError}</p>}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => { setShowExtractModal(false); setExtractTarget(null); setExtractFolderName(""); setExtractError(""); }} className="btn btn-secondary">Cancel</button>
              <button onClick={confirmExtract} className="btn btn-primary">Extract</button>
            </div>
          </div>
        </div>
      )}
      {showImageModal && (
        <ImagePreviewModal fileUrl={imageUrl} onClose={() => setShowImageModal(false)} />
      )}
      {showVideoModal && (
        <VideoPreviewModal fileUrl={videoUrl} onClose={() => setShowVideoModal(false)} />
      )}
    </div>
  );
};

function PDFPreviewModal({ fileUrl, onClose, fileName }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 relative max-w-3xl w-full flex flex-col items-center">
        <button onClick={onClose} className="absolute top-2 right-2 p-2 bg-gray-200 rounded-full hover:bg-gray-300" title="Close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="flex justify-between items-center w-full mb-2">
          <span className="text-gray-700 font-medium truncate">{fileName}</span>
          <a href={fileUrl} download className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700" title="Download">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
          </a>
        </div>
        {error ? (
          <div className="text-red-500">Failed to load PDF: {error}</div>
        ) : (
          <PDFDocument
            file={fileUrl}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setLoading(false); }}
            onLoadError={err => { setError(err.message); setLoading(false); }}
            loading={<div className="text-center py-8">Loading PDF...</div>}
          >
            <PDFPage pageNumber={pageNumber} width={600} />
          </PDFDocument>
        )}
        <div className="flex justify-between items-center mt-4 w-full">
          <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50">Prev</button>
          <span>Page <input type="number" min={1} max={numPages || 1} value={pageNumber} onChange={e => setPageNumber(Number(e.target.value))} className="w-12 text-center border rounded mx-1" /> of {numPages}</span>
          <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages} className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}

function ImagePreviewModal({ fileUrl, onClose, fileName }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 relative max-w-2xl w-full flex flex-col items-center">
        <button onClick={onClose} className="absolute top-2 right-2 p-2 bg-gray-200 rounded-full hover:bg-gray-300" title="Close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="flex justify-between items-center w-full mb-2">
          <span className="text-gray-700 font-medium truncate">{fileName}</span>
          <a href={fileUrl} download className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700" title="Download">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
          </a>
        </div>
        <img src={fileUrl} alt="Preview" className="max-w-full max-h-[70vh] rounded shadow" style={{objectFit: 'contain'}} />
      </div>
    </div>
  );
}

function VideoPreviewModal({ fileUrl, onClose, fileName }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 relative max-w-4xl w-full flex flex-col items-center">
        <button onClick={onClose} className="absolute top-2 right-2 p-2 bg-gray-200 rounded-full hover:bg-gray-300" title="Close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="flex justify-between items-center w-full mb-2">
          <span className="text-gray-700 font-medium truncate">{fileName}</span>
          <a href={fileUrl} download className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700" title="Download">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
          </a>
        </div>
        <video
          src={fileUrl}
          controls
          playsInline
          className="max-w-full max-h-[80vh] w-[720px] h-[405px] rounded bg-black"
          style={{ objectFit: 'contain' }}
        />
      </div>
    </div>
  );
}

export default Home;