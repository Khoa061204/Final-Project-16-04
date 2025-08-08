import React, { useRef, useState, useEffect } from 'react';
import { FaEllipsisV, FaShareAlt, FaFileArchive, FaDownload, FaInfo, FaTrash, FaFolderOpen, FaStar, FaRegStar } from 'react-icons/fa';

const ItemMenu = ({ item, onShare, onDownload, onInfo, onDelete, onExtract, onViewContents, onFavorite, openMenuId, setOpenMenuId }) => {
  const btnRef = useRef();
  const menuRef = useRef();
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [menuPlacement, setMenuPlacement] = useState('bottom-right'); // bottom-right, bottom-left, top-right, top-left

  const calculateMenuPosition = (rect) => {
    const menuWidth = 224; // 14rem = 224px
    const menuHeight = 200; // Approximate height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let top, left, placement;

    // Check if menu would overflow right side
    if (rect.right + menuWidth > viewportWidth + scrollX) {
      // Menu would overflow right, position to the left of button
      left = rect.left + scrollX - menuWidth;
      placement = 'bottom-left';
    } else {
      // Menu fits to the right of button
      left = rect.right + scrollX;
      placement = 'bottom-right';
    }

    // Check if menu would overflow bottom
    if (rect.bottom + menuHeight > viewportHeight + scrollY) {
      // Menu would overflow bottom, position above button
      top = rect.top + scrollY - menuHeight - 4;
      placement = placement === 'bottom-right' ? 'top-right' : 'top-left';
    } else {
      // Menu fits below button
      top = rect.bottom + scrollY + 4;
    }

    // Ensure menu doesn't go off-screen to the left
    if (left < scrollX) {
      left = scrollX + 8;
    }

    // Ensure menu doesn't go off-screen to the top
    if (top < scrollY) {
      top = scrollY + 8;
    }

    return { top, left, placement };
  };

  const handleOpenMenu = (e) => {
    e.stopPropagation();
    const rect = btnRef.current.getBoundingClientRect();
    const position = calculateMenuPosition(rect);
    setMenuPos({ top: position.top, left: position.left });
    setMenuPlacement(position.placement);
    setOpenMenuId(item._id || item.id);
  };

  // Click-away handler
  useEffect(() => {
    if (openMenuId !== (item._id || item.id)) return;
    
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
      }
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId, setOpenMenuId, item._id, item.id]);

  const ext = item.name?.split('.').pop()?.toLowerCase() || '';

  return (
    <div className="relative inline-block text-left">
      <button 
        ref={btnRef} 
                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50" 
        onClick={handleOpenMenu}
        aria-label="More options"
        title="More options"
      >
        <FaEllipsisV className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
      
      {openMenuId === (item._id || item.id) && (
        <div
          ref={menuRef}
          className="fixed w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1"
          style={{ 
            top: menuPos.top, 
            left: menuPos.left,
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          <div className="px-1">
            <button 
              onMouseDown={e => { e.stopPropagation(); setOpenMenuId(null); onShare(item); }} 
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 rounded-md transition-colors"
            >
              <FaShareAlt className="mr-3 w-4 h-4" />
              Share
            </button>
            
            <button 
              onMouseDown={e => { e.stopPropagation(); onDownload(item); setOpenMenuId(null); }} 
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 rounded-md transition-colors"
            >
              <FaDownload className="mr-3 w-4 h-4" />
              Download
            </button>
            
            <button 
              onMouseDown={e => { e.stopPropagation(); onInfo(item); setOpenMenuId(null); }} 
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 rounded-md transition-colors"
            >
              <FaInfo className="mr-3 w-4 h-4" />
              Info
            </button>

            {(item.type === 'file' || item.type === 'document') && onFavorite && (
              <button 
                onMouseDown={e => { e.stopPropagation(); onFavorite(item); setOpenMenuId(null); }} 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-md transition-colors"
              >
                {item.is_favorite ? (
                  <>
                    <FaStar className="mr-3 w-4 h-4 text-yellow-500" />
                    Remove from Favorites
                  </>
                ) : (
                  <>
                    <FaRegStar className="mr-3 w-4 h-4" />
                    Add to Favorites
                  </>
                )}
              </button>
            )}
            
            {item.type === 'folder' && (
              <button 
                onMouseDown={e => { e.stopPropagation(); onViewContents(item); setOpenMenuId(null); }} 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors"
              >
                <FaFolderOpen className="mr-3 w-4 h-4" />
                View Contents
              </button>
            )}
            
            {(ext === 'zip' || ext === 'rar') && (
              <button 
                onMouseDown={e => { e.stopPropagation(); onExtract(item); setOpenMenuId(null); }} 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors"
              >
                <FaFileArchive className="mr-3 w-4 h-4" />
                Extract
              </button>
            )}
            
            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            
            <button 
              onMouseDown={e => { e.stopPropagation(); onDelete(item); setOpenMenuId(null); }} 
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
            >
              <FaTrash className="mr-3 w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemMenu; 