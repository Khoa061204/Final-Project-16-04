import React from "react";

const Sidebar = () => {
  return (
    <div className="h-screen bg-indigo-900 w-60 flex flex-col">
      {/* Navigation items */}
      <nav className="px-4 flex-1">
        <ul className="space-y-2">
          <li className="bg-indigo-700 rounded px-3 py-2 text-white flex items-center">
            <span className="mr-3">🗃️</span>
            <span>My cloud</span>
          </li>
          <li className="rounded px-3 py-2 text-white flex items-center hover:bg-indigo-800 cursor-pointer">
            <span className="mr-3">🔄</span>
            <span>Shared files</span>
          </li>
          <li className="rounded px-3 py-2 text-white flex items-center hover:bg-indigo-800 cursor-pointer">
            <span className="mr-3">⭐</span>
            <span>Favorites</span>
          </li>
          <li className="rounded px-3 py-2 text-white flex items-center hover:bg-indigo-800 cursor-pointer">
            <span className="mr-3">☁️</span>
            <span>Upload files</span>
          </li>
        </ul>
      </nav>
      
      {/* Bottom menu items */}
      <div className="px-4 mb-6">
        <ul className="space-y-2">
          <li className="rounded px-3 py-2 text-white flex items-center hover:bg-indigo-800 cursor-pointer">
            <span className="mr-3">⚙️</span>
            <span>Settings</span>
          </li>
          <li className="rounded px-3 py-2 text-white flex items-center hover:bg-indigo-800 cursor-pointer">
            <span className="mr-3">🚪</span>
            <span>Log out</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;