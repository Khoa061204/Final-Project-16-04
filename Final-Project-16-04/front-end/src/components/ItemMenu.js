import React from 'react';
import { FaEllipsisV, FaShareAlt } from 'react-icons/fa';

const ItemMenu = ({ item, onShare, onDownload, onInfo, onDelete, openMenuId, setOpenMenuId }) => (
  <div className="relative custom-dropdown inline-block text-left">
    <button className="p-1.5 rounded hover:bg-gray-100" onClick={e => { e.stopPropagation(); setOpenMenuId(item._id || item.id); }}><FaEllipsisV /></button>
    {openMenuId === (item._id || item.id) && (
      <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded shadow-lg z-10">
        <button onClick={e => { e.stopPropagation(); setOpenMenuId(null); onShare(item); }} className="w-full flex items-center px-3 py-2 hover:bg-gray-100"><FaShareAlt className="mr-2" />Share</button>
        <button onClick={e => { e.stopPropagation(); onDownload(item); }} className="w-full flex items-center px-3 py-2 hover:bg-gray-100">Download</button>
        <button onClick={e => { e.stopPropagation(); onInfo(item); }} className="w-full flex items-center px-3 py-2 hover:bg-gray-100">Info</button>
        <button onClick={e => { e.stopPropagation(); onDelete(item); }} className="w-full flex items-center px-3 py-2 hover:bg-gray-100 text-red-600">Delete</button>
      </div>
    )}
  </div>
);

export default ItemMenu; 