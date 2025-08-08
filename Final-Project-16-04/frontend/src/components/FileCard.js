import React, { useState } from 'react';
import { FaFile, FaFileAlt, FaImage, FaFilePdf, FaFileWord, FaFileExcel, FaEllipsisV, FaShareAlt } from 'react-icons/fa';
import ShareModal from './ShareModal';

const FileCard = React.memo(function FileCard({ file, onClick, onDragStart, style, children, onShareSuccess }) {
  const [showShareModal, setShowShareModal] = useState(false);

  // Function to determine which icon to show
  const getFileIcon = () => {
    if (file.type === 'document') {
      return <FaFileAlt className="w-10 h-10 text-primary" />;
    }
    
    // Check file extension for other types
    const extension = file.name?.split('.').pop()?.toLowerCase() || '';
    switch (extension) {
      case 'pdf':
        return <FaFilePdf className="w-10 h-10 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FaFileWord className="w-10 h-10 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FaFileExcel className="w-10 h-10 text-green-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FaImage className="w-10 h-10 text-purple-500" />;
      default:
        return <FaFile className="w-10 h-10 text-gray-400" />;
    }
  };

  // Function to format the file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleShareClick = (e) => {
    console.log('🎯 FileCard share button clicked!');
    console.log('📄 File:', file);
    e.stopPropagation(); // Prevent card click event
    setShowShareModal(true);
  };

  const handleShareSuccess = (result) => {
    setShowShareModal(false);
    if (onShareSuccess) {
      onShareSuccess(result);
    }
  };

  // Determine resource type and name for sharing
  const resourceType = file.type === 'document' ? 'document' : 'file';
  const resourceName = file.title || file.name || file.filename || `${resourceType} #${file.id}`;

  return (
    <>
      <div
        className="group relative bg-white rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
        onClick={onClick}
        draggable
        onDragStart={onDragStart}
        style={style}
      >
        <div className="flex flex-col p-4">
          {/* Top section with icon and type badge */}
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-primary/5 transition-colors duration-200">
              {getFileIcon()}
            </div>
            {file.type === 'document' && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Document
              </span>
            )}
          </div>

          {/* File info */}
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 truncate mb-1" title={resourceName}>
              {resourceName}
            </h3>
            <div className="flex items-center text-xs text-gray-500 space-x-2">
              <span>{formatFileSize(file.size)}</span>
              {file.modifiedAt && (
                <>
                  <span>•</span>
                  <span>{new Date(file.modifiedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions overlay - Updated with share button */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
            <button 
              onClick={handleShareClick}
              className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-colors"
              title="Share"
            >
              <FaShareAlt className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <FaEllipsisV className="w-4 h-4" />
            </button>
          </div>

          {children}
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        resourceType={resourceType}
        resourceId={file.id}
        resourceName={resourceName}
        onShareSuccess={handleShareSuccess}
      />
    </>
  );
});

export default FileCard; 