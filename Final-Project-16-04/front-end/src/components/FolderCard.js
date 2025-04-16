import React from "react";

const FolderCard = ({ title, size, items }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-md transition-all">
      {/* Thumbnail area */}
      <div className="h-32 bg-gray-100 flex items-center justify-center">
        <span className="text-4xl text-gray-400">📁</span>
      </div>
      
      {/* Content area */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{size} • {items}</p>
      </div>
    </div>
  );
};

export default FolderCard;