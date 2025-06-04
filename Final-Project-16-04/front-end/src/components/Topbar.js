import React from "react";
import { FiSettings } from 'react-icons/fi';

const Topbar = () => {
  return (
    <div className="bg-white h-14 flex items-center justify-between px-4 border-b border-gray-200">
      <div className="flex-1" />
      <div className="flex items-center space-x-2">
        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-sm">
          <FiSettings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Topbar;