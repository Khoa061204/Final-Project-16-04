import React from 'react';
import PropTypes from 'prop-types';
import { FaFolder, FaEllipsisV } from 'react-icons/fa';

const FolderCard = ({ 
  title, 
  size, 
  items,
  onClick,
  className = '',
  lastModified,
  isShared
}) => {
  return (
    <div
      className={`
        group
        relative
        bg-white 
        rounded-xl 
        border
        border-gray-200
        hover:border-primary/30
        hover:shadow-lg
        hover:shadow-primary/5
        transition-all
        duration-200
        cursor-pointer
        ${className}
      `}
      onClick={onClick}
    >
      <div className="p-4">
        {/* Top section with icon */}
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-primary/5 transition-colors duration-200">
            <FaFolder className="w-10 h-10 text-primary" />
          </div>
          {isShared && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Shared
            </span>
          )}
        </div>

        {/* Folder info */}
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 truncate mb-1" title={title}>
            {title}
          </h3>
          <div className="flex items-center text-xs text-gray-500 space-x-2">
            <span>{items}</span>
            <span>•</span>
            <span>{size}</span>
            {lastModified && (
              <>
                <span>•</span>
                <span>{lastModified}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Handle menu click
            }}
          >
            <FaEllipsisV className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

FolderCard.propTypes = {
  title: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
  items: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string,
  lastModified: PropTypes.string,
  isShared: PropTypes.bool
};

FolderCard.defaultProps = {
  className: '',
  isShared: false
};

export default FolderCard;