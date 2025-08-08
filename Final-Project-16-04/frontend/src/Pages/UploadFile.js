import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ALLOWED_EXTENSIONS = [
  // Text files
  '.txt', '.md', '.markdown', '.rst', '.text',
  // Code files
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.dart',
  // Web files
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.json', '.xml', '.yaml', '.yml',
  // Data files
  '.csv', '.tsv', '.sql',
  // Config files
  '.env', '.config', '.ini', '.conf',
  // Shell scripts
  '.sh', '.bash', '.zsh', '.bat', '.cmd', '.ps1',
  // PDF files
  '.pdf',
  // Image files
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
  // Video files
  '.mp4', '.webm', '.ogg', '.mkv',
  // Archive files
  '.zip', '.rar'
];

function UploadFile() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isFoldersLoading, setIsFoldersLoading] = useState(true);
  const [fileType, setFileType] = useState('text'); // 'text', 'binary', or 'image'

  // Fetch folders on mount
  useEffect(() => {
    const fetchFolders = async () => {
      setIsFoldersLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/folders`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch folders');
        const data = await response.json();
        setFolders(data.folders || []);
      } catch (err) {
        setFolders([]);
        setMessage("Failed to load folders. Please refresh the page.");
      } finally {
        setIsFoldersLoading(false);
      }
    };
    fetchFolders();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        setMessage("❌ Unsupported file type. Please select a supported file.");
        setFile(null);
        return;
      }
      let type = 'text';
      if (extension === '.pdf') type = 'binary';
      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(extension)) type = 'image';
      if (['.mp4', '.webm', '.ogg', '.mkv'].includes(extension)) type = 'video';
      setFile(selectedFile);
      setFileType(type);
      setMessage("");
      setProgress(0);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const extension = droppedFile.name.substring(droppedFile.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        setMessage("❌ Unsupported file type. Please select a supported file.");
        setFile(null);
        return;
      }
      let type = 'text';
      if (extension === '.pdf') type = 'binary';
      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(extension)) type = 'image';
      if (['.mp4', '.webm', '.ogg', '.mkv'].includes(extension)) type = 'video';
      setFile(droppedFile);
      setFileType(type);
      setMessage("");
      setProgress(0);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first");
      return;
    }

    setLoading(true);
    setMessage("Uploading file...");
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      if (selectedFolder) {
        formData.append('folder_id', selectedFolder);
      }

      setProgress(40);
      setMessage("Uploading file...");

      const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
          // Do NOT set Content-Type for FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(errorData.message || 'Upload failed');
      }

      setProgress(80);
      const data = await response.json();
      setProgress(100);
      setMessage("✅ File uploaded successfully!");
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setMessage("❌ Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg transition-colors duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Upload File as Document</h2>
                <button 
                  onClick={() => navigate(-1)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 flex items-center"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Folder (Optional)
                </label>
                <div className="relative flex items-center">
                  <select
                    value={selectedFolder}
                    onChange={e => setSelectedFolder(e.target.value)}
                    className={`w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                      isFoldersLoading ? 'bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400' : ''
                    } ${selectedFolder ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
                    disabled={loading || isFoldersLoading || selectedFolder}
                  >
                    <option value="">No folder</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                  {selectedFolder && (
                    <button
                      onClick={() => setSelectedFolder("")}
                      className="absolute right-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2"
                      type="button"
                      disabled={loading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {folders.length === 0 && !isFoldersLoading && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No folders available. Create a folder first.</p>
                )}
              </div>

              <div 
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  type="file"
                  accept={ALLOWED_EXTENSIONS.join(',')}
                  onChange={handleFileChange}
                  disabled={loading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <label className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-200">
                      <span>Upload a file</span>
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Supported files: Text, Code, Web, Data, Config, Shell scripts, PDFs, ZIP, and RAR archives
                  </p>
                </div>

                {file && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Selected file: <span className="font-medium">{file.name}</span>
                    </p>
                  </div>
                )}
              </div>

              {progress > 0 && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">{progress}% uploaded</p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={loading || !file || isFoldersLoading}
                className={`w-full mt-6 py-3 px-4 rounded-lg text-white font-medium transition duration-200 ${
                  loading || !file || isFoldersLoading
                    ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : "Upload File"}
              </button>

              {message && (
                <div className={`mt-4 p-4 rounded-lg ${
                  message.includes("✅") 
                    ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800" 
                    : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                }`}>
                  <p className="text-sm font-medium">{message}</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default UploadFile;