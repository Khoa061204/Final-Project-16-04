import React from "react";
import { FiSearch, FiSettings, FiUser, FiGrid } from 'react-icons/fi';

const Topbar = () => {
  return (
    <div className="bg-white h-14 flex items-center justify-between px-4 border-b border-gray-200">
      {/* Left section with search */}
      <div className="flex-1 max-w-2xl flex items-center">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-4 py-1.5 text-sm border border-gray-300 rounded-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Right section with actions */}
      <div className="flex items-center space-x-2">
        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-sm">
          <FiGrid className="h-5 w-5" />
        </button>
        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-sm">
          <FiSettings className="h-5 w-5" />
        </button>
        <div className="h-6 w-px bg-gray-300 mx-2"></div>
        <button className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-sm">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
            <FiUser className="h-5 w-5" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default Topbar;