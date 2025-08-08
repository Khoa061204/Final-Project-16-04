import React, { useState, useRef, useCallback } from 'react';
import { FiUpload, FiX, FiFile, FiFolder } from 'react-icons/fi';
import { getApiUrl } from '../config/api';

const DragDropUpload = ({ onUpload, currentFolderId = null, disabled = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef(null);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter <= 1) {
      setIsDragOver(false);
    }
  }, [dragCounter]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFiles(files);
    }
  }, []);

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      await handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, []);

  const handleFiles = async (files) => {
    if (disabled || uploading) return;

    setUploading(true);
    const progress = {};
    
    // Initialize progress for each file
    files.forEach(file => {
      progress[file.name] = 0;
    });
    setUploadProgress(progress);

    try {
      // Process files in batches to avoid overwhelming the server
      const batchSize = 3;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (file) => {
          try {
            await uploadFile(file, (progressValue) => {
              setUploadProgress(prev => ({
                ...prev,
                [file.name]: progressValue
              }));
            });
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            // Continue with other files even if one fails
          }
        }));
      }

      // Clear progress after successful upload
      setUploadProgress({});
      if (onUpload) {
        onUpload();
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const uploadFile = async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) {
      formData.append('folder_id', currentFolderId);
    }

    const token = localStorage.getItem('token');
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', getApiUrl('/files/upload'));
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const videoExts = ['mp4', 'webm', 'ogg', 'mkv', 'avi', 'mov'];
    const audioExts = ['mp3', 'wav', 'ogg', 'aac'];
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];

    if (imageExts.includes(ext)) return '🖼️';
    if (videoExts.includes(ext)) return '🎥';
    if (audioExts.includes(ext)) return '🎵';
    if (docExts.includes(ext)) return '📄';
    if (archiveExts.includes(ext)) return '📦';
    return '📁';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Drag & Drop Zone */}
      <div
        className={`relative transition-all duration-200 ${
          isDragOver 
            ? 'scale-105 shadow-2xl' 
            : 'hover:scale-102 hover:shadow-lg'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Main Upload Area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
            ${isDragOver 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
            ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className={`
              p-4 rounded-full transition-colors duration-200
              ${isDragOver 
                ? 'bg-blue-100 dark:bg-blue-800' 
                : 'bg-gray-100 dark:bg-gray-800'
              }
            `}>
              <FiUpload className={`w-8 h-8 ${
                isDragOver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
            
            <div>
              <h3 className={`text-lg font-medium ${
                isDragOver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
              }`}>
                {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                or click to browse files
              </p>
            </div>

            {currentFolderId && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <FiFolder className="w-4 h-4" />
                <span>Files will be uploaded to current folder</span>
              </div>
            )}
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && Object.keys(uploadProgress).length > 0 && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-500 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                Uploading Files...
              </h4>
              <button
                onClick={() => {
                  setUploading(false);
                  setUploadProgress({});
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="flex items-center space-x-3">
                  <span className="text-lg">{getFileIcon(fileName)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate text-gray-900 dark:text-gray-100">
                        {fileName}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-20 z-50 pointer-events-none">
          <div className="flex items-center justify-center h-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
              <div className="flex items-center space-x-4">
                <FiUpload className="w-8 h-8 text-blue-500" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Drop to upload
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Release to upload your files
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DragDropUpload; 