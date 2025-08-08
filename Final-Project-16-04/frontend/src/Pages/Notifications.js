import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { getAuthHeaders } from '../utils/auth';
import { FaBell, FaCheck, FaTrash, FaEnvelope, FaUsers, FaFileAlt, FaFolder, FaCalendar, FaExclamationTriangle, FaFilter } from 'react-icons/fa';
import io from 'socket.io-client';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const { isAuthenticated, user } = useContext(AuthContext);

  const API_BASE_URL = 'http://localhost:5000/api';

  // Fetch all notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping notifications fetch');
      setIsLoading(false);
      return;
    }
    
    console.log('Fetching notifications for user:', user?.id);
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();
      console.log('Auth headers:', headers);
      
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: headers
      });
      
      console.log('Notifications response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Notifications data:', data);
        setNotifications(data.notifications || []);
      } else {
        console.error('Notifications response not ok:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
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

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true; // 'all'
  });

  // Fetch notifications on component mount
  useEffect(() => {
    console.log('Notifications component mounted, isAuthenticated:', isAuthenticated);
    fetchNotifications();
  }, [isAuthenticated]);

  // Set up Socket.IO for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = io('http://localhost:5000', {
      transports: ['polling'],
      upgrade: false,
      forceNew: true
    });

    socket.on('new-notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    socket.on('notification-updated', ({ id, isRead }) => {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead } : n)
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <div className="p-6 text-center">Please log in to view notifications.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FaBell className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        </div>
        <div className="flex items-center space-x-4">
          {/* Filter */}
          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
          
          {/* Mark all as read */}
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-300">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <FaBell className="w-16 h-16 text-gray-300 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
          </h3>
          <p className="text-gray-500 dark:text-gray-300">
            {filter === 'all' 
              ? 'You\'ll see notifications here when someone shares files, assigns tasks, or invites you to teams.'
              : `You don't have any ${filter} notifications.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border p-4 hover:shadow-md transition-shadow ${
                !notification.isRead ? 'border-blue-200 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Mark as read"
                        >
                          <FaCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {notifications.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {notifications.filter(n => !n.isRead).length} unread • {notifications.length} total
            </span>
            <span>
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications; 