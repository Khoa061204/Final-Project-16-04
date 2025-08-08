import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { handleLogout } from "../utils/auth";
import { AuthContext } from "../App";
import { getApiUrl } from "../config/api";
import { 
  MdCloud, 
  MdGroup, 
  MdGroupAdd, 
  MdNotifications,
  MdCalendarToday,
  MdChat,
  MdSettings, 
  MdLogout, 
  MdMenu,
  MdPerson,
  MdChevronLeft,
  MdCheck,
  MdAssignmentTurnedIn,
  MdShare
} from 'react-icons/md';
import Profile from './Profile';
import TeamChat from "./TeamChat";

const NavItem = ({ icon: Icon, label, onClick, badge, isActive }) => (
  <li
    className={`rounded-lg px-3 py-2.5 flex items-center cursor-pointer transition-all duration-200 font-medium ${
      isActive 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
    }`}
    onClick={onClick}
  >
    <Icon className={`text-xl ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`} />
    <span className={`ml-3 ${isActive ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>{label}</span>
    {badge > 0 && (
      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-medium animate-pulse">
        {badge}
      </span>
    )}
  </li>
);

const Sidebar = ({ onClose, teams = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsAuthenticated, setUser, setRememberMe, user } = useContext(AuthContext);
  const [showProfile, setShowProfile] = useState(false);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const fetchInvites = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(getApiUrl('/teams/invitations/list'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setPendingInvites(data.invitations ? data.invitations.length : 0);
        } else {
          // Silently fail for now - teams invitations not critical
          setPendingInvites(0);
        }
      } catch (err) {
        setPendingInvites(0);
      }
    };

    // Debounce the fetch to prevent excessive requests
    const timeoutId = setTimeout(fetchInvites, 1000);
    return () => clearTimeout(timeoutId);
  }, [user?.id]); // Changed dependency to user.id to prevent unnecessary re-fetches

  // Note: Notifications are now handled by NotificationCenter component
  // This prevents duplicate API requests and improves performance

  // Note: Socket.IO notifications are now handled by NotificationCenter component
  // This avoids duplicate socket connections and improves performance

  const onLogout = () => {
    handleLogout();
    setIsAuthenticated(false);
    setUser(null);
    setRememberMe(false);
    navigate('/login');
  };

  const navigateTo = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };


  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        <ul className="space-y-1">
          <NavItem
            icon={MdCloud}
            label="My Cloud"
            onClick={() => navigateTo('/')}
            isActive={isActive('/')}
          />
          <NavItem
            icon={MdAssignmentTurnedIn}
            label="My Projects"
            onClick={() => navigateTo('/projects')}
            isActive={isActive('/projects')}
          />
          <NavItem
            icon={MdGroup}
            label="My Teams"
            onClick={() => navigateTo('/teams')}
            isActive={isActive('/teams')}
            badge={pendingInvites}
          />
          <NavItem
            icon={MdCalendarToday}
            label="Calendar"
            onClick={() => navigateTo('/calendar')}
            isActive={isActive('/calendar')}
          />

          <NavItem
            icon={MdNotifications}
            label="Notifications"
            onClick={() => navigateTo('/notifications')}
            isActive={isActive('/notifications')}
            badge={unreadNotifications}
          />
        </ul>
      </nav>

      {/* Footer with Profile and Settings */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {/* Profile and Settings Row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <MdPerson className="text-white text-sm" />
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.username || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </button>
          <button
            onClick={() => navigateTo('/settings')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MdSettings className="text-lg" />
          </button>
        </div>
        
        {/* Sign Out Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all duration-200 font-medium"
        >
          <MdLogout className="text-lg mr-2" />
          Sign Out
        </button>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <Profile
          onClose={() => setShowProfile(false)}
          user={user}
        />
      )}
    </div>
  );
};

export default Sidebar;