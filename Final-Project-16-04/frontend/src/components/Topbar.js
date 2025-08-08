import React from "react";
import { FiSettings } from 'react-icons/fi';
import NotificationCenter from './NotificationCenter';
import ThemeToggle from './ThemeToggle';

const Topbar = () => {
  return (
    <div className="bg-white dark:bg-gray-800 h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div className="flex-1" />
      <div className="flex items-center space-x-2">
        <ThemeToggle className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" />
        <NotificationCenter />
        <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm transition-colors duration-200">
          <FiSettings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Topbar;