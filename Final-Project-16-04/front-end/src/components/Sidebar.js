import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  MdMenu,
  MdPerson,
  MdClose
} from 'react-icons/md';
import Profile from './Profile';
import TeamChat from "./TeamChat";

const NavItem = ({ icon: Icon, label, onClick, badge, isActive }) => (
  <li
    className={`rounded-lg px-3 py-2.5 flex items-center cursor-pointer transition-all duration-200 ${
      isActive 
        ? 'bg-primary text-white' 
        : 'text-gray-700 hover:bg-gray-100'
    }`}
    onClick={onClick}
  >
    <Icon className={`text-xl ${isActive ? 'text-white' : 'text-gray-500'}`} />
    <span className={`ml-3 font-medium ${isActive ? 'text-white' : 'text-gray-700'}`}>{label}</span>
    {badge > 0 && (
      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">
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

  useEffect(() => {
    const fetchInvites = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/teams/invitations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setPendingInvites(data.invitations ? data.invitations.length : 0);
        }
      } catch (err) {
        setPendingInvites(0);
      }
    };
    fetchInvites();
  }, [user]);

  const onLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setRememberMe(false);
    handleLogout();
    navigate('/login', { replace: true });
  };

  const navigateTo = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <div className="h-full bg-white border-r border-gray-200 w-64 flex flex-col">
      {/* Mobile close button */}
      <button
        onClick={onClose}
        className="lg:hidden absolute top-4 right-4 p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <MdClose className="h-5 w-5 text-gray-500" />
      </button>

      {/* Profile section */}
      <div className="p-4 border-b border-gray-200">
        <div 
          className="flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors duration-200"
          onClick={() => setShowProfile(true)}
        >
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <MdPerson className="text-white text-xl" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || user?.username || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          <NavItem
            icon={MdCloud}
            label="My Cloud"
            onClick={() => navigateTo('/')}
            isActive={location.pathname === '/'}
          />
          <NavItem
            icon={MdGroup}
            label="My Teams"
            onClick={() => navigateTo('/teams')}
            badge={pendingInvites}
            isActive={location.pathname === '/teams'}
          />
          <NavItem
            icon={MdCalendarToday}
            label="Calendar"
            onClick={() => navigateTo('/calendar')}
            isActive={location.pathname === '/calendar'}
          />
          <NavItem
            icon={MdChat}
            label="Team Chat"
            onClick={() => navigateTo('/chat')}
            isActive={location.pathname === '/chat'}
          />
          <NavItem
            icon={MdNotifications}
            label="Notifications"
            onClick={() => navigateTo('/notifications')}
            isActive={location.pathname === '/notifications'}
          />
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-gray-200">
        <ul className="space-y-1">
          <NavItem
            icon={MdSettings}
            label="Settings"
            onClick={() => navigateTo('/settings')}
            isActive={location.pathname === '/settings'}
          />
          <NavItem
            icon={MdLogout}
            label="Log out"
            onClick={onLogout}
            isActive={false}
          />
        </ul>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <Profile onClose={() => setShowProfile(false)} />
        </div>
      )}
    </div>
  );
};

export default Sidebar;