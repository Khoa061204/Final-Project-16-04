import React from "react";
import { FaFolder, FaHome, FaUsers, FaCog, FaFileAlt } from "react-icons/fa";

const Sidebar = () => {
  return (
    <div className="w-64 bg-white border-r h-full p-4 flex flex-col justify-between">
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-bold">Your Team</h2>
          <p className="text-sm text-gray-500">hello@yourapp.com</p>
        </div>

        <nav className="space-y-2">
          <SidebarItem icon={<FaHome />} label="Home" />
          <SidebarItem icon={<FaFileAlt />} label="My Projects" />
          
          <div className="mt-4">
            <p className="text-xs text-gray-400 uppercase mb-1">Folders</p>
            <SidebarItem icon={<FaFolder />} label="View All" />
            <SidebarItem icon={<FaFolder />} label="Recent" />
            <SidebarItem icon={<FaFolder />} label="Favorites" />
            <SidebarItem icon={<FaFolder />} label="Shared" />
            <SidebarItem icon={<FaFolder />} label="Archived" />
          </div>

          <SidebarItem icon={<FaFileAlt />} label="All Files" />
          <SidebarItem icon={<FaUsers />} label="Team Members" />
          <SidebarItem icon={<FaCog />} label="Settings" />
        </nav>
      </div>

      <div>
        <button className="text-sm text-gray-600 hover:text-gray-900">Logout</button>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon, label }) => (
  <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer text-sm text-gray-700">
    {icon}
    {label}
  </div>
);

export default Sidebar;
