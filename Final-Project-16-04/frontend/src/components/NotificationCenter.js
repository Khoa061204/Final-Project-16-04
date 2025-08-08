import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { getAuthHeaders } from '../utils/auth';
import { FaBell, FaTimes, FaCheck, FaTrash, FaEnvelope, FaUsers, FaFileAlt, FaFolder, FaCalendar, FaExclamationTriangle } from 'react-icons/fa';
import io from 'socket.io-client';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, user } = useContext(AuthContext);

  const API_BASE_URL = 'http://localhost:5000/api';
  const SOCKET_URL = 'http://localhost:5000';

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      console.log('🔔 fetchNotifications: Not authenticated');
      return;
    }
    
    console.log('🔔 fetchNotifications: Starting fetch for user:', user?.id);
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();
      console.log('🔔 fetchNotifications: Auth headers:', headers);
      
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: headers
      });
      
      console.log('🔔 fetchNotifications: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔔 fetchNotifications: Received data:', data);
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter(n => !n.isRead).length || 0);
      } else {
        console.error('🔔 fetchNotifications: Response not ok:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('🔔 fetchNotifications: Error response:', errorText);
      }
    } catch (error) {
      console.error('🔔 fetchNotifications: Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => {
          const deletedNotification = notifications.find(n => n.id === notificationId);
          return deletedNotification && !deletedNotification.isRead ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_assigned':
        return <FaCalendar className="text-blue-500" />;
      case 'file_share':
        return <FaFileAlt className="text-green-500" />;
      case 'document_share':
        return <FaFileAlt className="text-blue-500" />;
      case 'folder_share':
        return <FaFolder className="text-yellow-500" />;
      case 'team_invitation':
        return <FaUsers className="text-purple-500" />;
      case 'deadline':
        return <FaExclamationTriangle className="text-red-500" />;
      default:
        return <FaEnvelope className="text-gray-500" />;
    }
  };

  // Format notification time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Set up Socket.IO for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      console.log('🔔 NotificationCenter: Not authenticated or no user ID');
      return;
    }

    console.log('🔔 NotificationCenter: Setting up Socket.IO connection');
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      forceNew: false,
      auth: {
        token: token
      }
    });

    socket.on('connect', () => {
      console.log('🔔 NotificationCenter: Socket.IO connected');
    });

    socket.on('new-notification', (notification) => {
      console.log('🔔 NotificationCenter: Received new notification:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    socket.on('notification-updated', ({ id, isRead }) => {
      console.log('🔔 NotificationCenter: Notification updated:', { id, isRead });
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead } : n)
      );
      if (isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    });

    // Join user's notification room
    if (user && user.id) {
      console.log('🔔 NotificationCenter: Joining user room:', user.id);
      socket.emit('join-user-room', user.id);
    }

    socket.on('error', (error) => {
      console.error('🔔 NotificationCenter: Socket.IO error:', error);
    });

    return () => {
      console.log('🔔 NotificationCenter: Disconnecting Socket.IO');
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  // Fetch notifications and set up polling
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      
      // Set up polling for new notifications - more frequent for responsiveness
      const interval = setInterval(fetchNotifications, 15000); // Check every 15 seconds
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <FaBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <FaBell className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            !notification.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                              title="Mark as read"
                            >
                              <FaCheck className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => window.location.href = '/notifications'}
                className="w-full text-sm text-blue-600 hover:text-blue-800 text-center"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter; 