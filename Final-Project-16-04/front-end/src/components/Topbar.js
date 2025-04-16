
import React from "react";

const Topbar = () => {
  return (
    <div className="bg-white h-16 flex items-center justify-between px-6 border-b border-gray-200">
      {/* Search bar */}
      <div className="relative w-96">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-400">🔍</span>
        </div>
        <input
          type="text"
          placeholder="Search"
          className="bg-gray-50 w-full pl-10 pr-4 py-2 rounded-full border-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>
      
      {/* User actions */}
      <div className="flex items-center space-x-4">
        <button className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          🔔
        </button>
        <button className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          👤
        </button>
      </div>
    </div>
  );
};

export default Topbar;