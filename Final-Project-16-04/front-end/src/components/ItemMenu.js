import React, { useRef, useState, useEffect } from 'react';
import { FaEllipsisV, FaShareAlt, FaFileArchive } from 'react-icons/fa';

const ItemMenu = ({ item, onShare, onDownload, onInfo, onDelete, onExtract, openMenuId, setOpenMenuId }) => {
  const btnRef = useRef();
  const menuRef = useRef();
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const handleOpenMenu = (e) => {
    e.stopPropagation();
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + window.scrollY + 4, left: rect.right + window.scrollX - 224 }); // 224 = menu width
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
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenuId, setOpenMenuId, item._id, item.id]);

  const ext = item.name?.split('.').pop()?.toLowerCase() || '';
  return (
    <div className="inline-block text-left">
      <button ref={btnRef} className="p-1.5 rounded hover:bg-gray-100" onClick={handleOpenMenu}>
        <FaEllipsisV className="text-gray-900" />
      </button>
      {openMenuId === (item._id || item.id) && (
        <div
          ref={menuRef}
          className="fixed w-56 bg-white border border-gray-200 rounded shadow-lg z-50"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <button onMouseDown={e => { e.stopPropagation(); setOpenMenuId(null); onShare(item); }} className="w-full flex items-center px-3 py-2 hover:bg-blue-50 text-blue-700"><FaShareAlt className="mr-2" />Share</button>
          <button onMouseDown={e => { e.stopPropagation(); onDownload(item); setOpenMenuId(null); }} className="w-full flex items-center px-3 py-2 hover:bg-blue-50 text-blue-700">Download</button>
          <button onMouseDown={e => { e.stopPropagation(); onInfo(item); setOpenMenuId(null); }} className="w-full flex items-center px-3 py-2 hover:bg-blue-50 text-blue-700">Info</button>
          {(ext === 'zip' || ext === 'rar') && (
            <button onMouseDown={e => { e.stopPropagation(); onExtract(item); setOpenMenuId(null); }} className="w-full flex items-center px-3 py-2 hover:bg-green-50 text-green-700"><FaFileArchive className="mr-2" />Extract</button>
          )}
          <button onMouseDown={e => { e.stopPropagation(); onDelete(item); setOpenMenuId(null); }} className="w-full flex items-center px-3 py-2 hover:bg-red-50 text-red-600">Delete</button>
        </div>
      )}
    </div>
  );
};

export default ItemMenu; 