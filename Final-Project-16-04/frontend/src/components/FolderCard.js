import React from 'react';
import PropTypes from 'prop-types';
import { FaFolder } from 'react-icons/fa';
import ItemMenu from './ItemMenu';

const FolderCard = ({ 
  title, 
  size, 
  items,
  onClick,
  className = '',
  lastModified,
  isShared,
  fileCount = 0,
  documentCount = 0,
  subfolderCount = 0,
  item,
  onShare,
  onDownload,
  onInfo,
  onDelete,
  onExtract,
  onViewContents,
  openMenuId,
  setOpenMenuId,
  // Drag and drop props
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
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
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
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
            <span>{items} items</span>
            {subfolderCount > 0 && (
              <>
                <span>•</span>
                <span>{subfolderCount} folders</span>
              </>
            )}
            {fileCount > 0 && (
              <>
                <span>•</span>
                <span>{fileCount} files</span>
              </>
            )}
            {documentCount > 0 && (
              <>
                <span>•</span>
                <span>{documentCount} docs</span>
              </>
            )}
            {lastModified && (
              <>
                <span>•</span>
                <span>{lastModified}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions overlay */}
        {item && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <ItemMenu
              item={item}
              onShare={onShare}
              onDownload={onDownload}
              onInfo={onInfo}
              onDelete={onDelete}
              onExtract={onExtract}
              onViewContents={onViewContents}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
            />
          </div>
        )}
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
  isShared: PropTypes.bool,
  item: PropTypes.object,
  onShare: PropTypes.func,
  onDownload: PropTypes.func,
  onInfo: PropTypes.func,
  onDelete: PropTypes.func,
  onExtract: PropTypes.func,
  onViewContents: PropTypes.func,
  openMenuId: PropTypes.string,
  setOpenMenuId: PropTypes.func,
  // Drag and drop props
  draggable: PropTypes.bool,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  onDragOver: PropTypes.func,
  onDrop: PropTypes.func
};

FolderCard.defaultProps = {
  className: '',
  isShared: false
};

export default FolderCard;