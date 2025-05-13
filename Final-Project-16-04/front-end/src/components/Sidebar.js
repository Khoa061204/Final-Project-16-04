import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { handleLogout } from "../utils/auth";
import { AuthContext } from "../App";
import { 
  MdCloud, 
  MdGroup, 
  MdGroupAdd, 
  MdNotifications,
  MdCalendarToday,
  MdChat,
  MdSettings, 
  MdLogout, 
  MdMenu 
} from 'react-icons/md';

const Sidebar = () => {
  const navigate = useNavigate();
  const { setIsAuthenticated, setUser, setRememberMe } = React.useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(true);

  const onLogout = () => {
    // Clear authentication state
    setIsAuthenticated(false);
    setUser(null);
    setRememberMe(false);
    
    // Clear tokens from localStorage
    handleLogout();
    
    // Navigate to login page
    navigate('/login', { replace: true });
  };

  const navigateTo = (path) => {
    navigate(path);
  };

  return (
    <div
      className={`h-screen bg-indigo-900 transition-all duration-300 flex flex-col z-40 ${collapsed ? 'w-16' : 'w-60'}`}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      style={{ position: 'relative' }}
    >
      {/* Top menu icon for mobile/desktop */}
      <div className="flex items-center justify-center py-4">
        <MdMenu className="text-white text-2xl" />
      </div>
      <nav className="px-2 flex-1">
        <ul className="space-y-2">
          <li
            className="rounded px-3 py-2 text-white flex items-center cursor-pointer hover:bg-indigo-800"
            onClick={() => navigateTo('/')}
          >
            <MdCloud className="text-2xl mr-0.5" />
            {!collapsed && <span className="ml-3">My Cloud</span>}
          </li>
          <li
            className="rounded px-3 py-2 text-white flex items-center hover:bg-indigo-800 cursor-pointer"
            onClick={() => navigateTo('/teams')}
          >
            <MdGroup className="text-2xl mr-0.5" />
            {!collapsed && <span className="ml-3">My Teams</span>}
          </li>
          <li
            className="rounded px-3 py-2 text-white flex items-center hover:bg-indigo-800 cursor-pointer"
            onClick={() => navigateTo('/teams/new')}
          >
            <MdGroupAdd className="text-2xl mr-0.5" />
            {!collapsed && <span className="ml-3">Add Team</span>}
          </li>
          <li
            className="rounded px-3 py-2 text-white flex items-center hover:bg-indigo-800 cursor-pointer"
            onClick={() => navigateTo('/calendar')}
          >
            <MdCalendarToday className="text-2xl mr-0.5" />
            {!collapsed && <span className="ml-3">Calendar</span>}
          </li>
          <li
            className="rounded px-3 py-2 text-white flex items-center hover:bg-indigo-800 cursor-pointer"
            onClick={() => navigateTo('/chat')}
          >
            <MdChat className="text-2xl mr-0.5" />
            {!collapsed && <span className="ml-3">Team Chat</span>}
          </li>
          <li
            className="rounded px-3 py-2 text-white flex items-center hover:bg-indigo-800 cursor-pointer"
            onClick={() => navigateTo('/notifications')}
          >
            <MdNotifications className="text-2xl mr-0.5" />
            {!collapsed && <span className="ml-3">Notifications</span>}
          </li>
        </ul>
      </nav>
      <div className="px-2 mb-6 mt-auto">
        <ul className="space-y-2">
          <li
            className="rounded px-3 py-2 text-white flex items-center hover:bg-indigo-800 cursor-pointer"
            onClick={() => navigateTo('/settings')}
          >
            <MdSettings className="text-2xl mr-0.5" />
            {!collapsed && <span className="ml-3">Settings</span>}
          </li>
          <li
            className="rounded px-3 py-2 text-white flex items-center hover:bg-indigo-800 cursor-pointer"
            onClick={onLogout}
          >
            <MdLogout className="text-2xl mr-0.5" />
            {!collapsed && <span className="ml-3">Log out</span>}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;