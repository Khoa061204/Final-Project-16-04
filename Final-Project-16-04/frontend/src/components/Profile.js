import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { 
  FiUser, FiMail, FiSettings, FiLogOut, FiCamera, FiShield, 
  FiActivity, FiBarChart2, FiEdit3, FiEye, FiEyeOff, FiTrash2,
  FiDownload, FiCalendar, FiFile, FiFolder, FiUsers, FiCheckSquare
} from 'react-icons/fi';

const Profile = ({ onClose }) => {
  const { user, setUser, setIsAuthenticated, setRememberMe } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [activityData, setActivityData] = useState(null);
  
  // Form states
  const [editedUsername, setEditedUsername] = useState(user?.username || '');
  const [editedEmail, setEditedEmail] = useState(user?.email || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Password change states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  
  // Error states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Load profile data
  useEffect(() => {
    if (user?.id) {
      loadProfileData();
      loadActivityData();
    }
  }, [user?.id]);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      } else {
        // Fallback with demo data if endpoint doesn't exist
        setProfileData({
          statistics: {
            files: 24,
            documents: 8,
            teams: 3,
            tasks: 12,
            storageUsed: 25 * 1024 * 1024 // 25MB
          }
        });
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      // Fallback with demo data
      setProfileData({
        statistics: {
          files: 0,
          documents: 0,
          teams: 0,
          tasks: 0,
          storageUsed: 0
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivityData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/activities`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Transform activity data for display
          const activities = data.data.activities || [];
          const transformedData = {
            activities: activities.slice(0, 10), // Show last 10 activities
            stats: data.data.stats,
            lastLogin: user?.last_login || new Date().toISOString()
          };
          setActivityData(transformedData);
        }
      } else {
        console.warn('Activity endpoint not available, using fallback data');
        // Fallback with demo data if endpoint doesn't exist
        setActivityData({
          activities: [
            {
              id: 1,
              type: 'account_login',
              description: 'Logged in successfully',
              timestamp: new Date().toISOString(),
              timeAgo: 'Just now'
            },
            {
              id: 2,
              type: 'team_joined',
              description: 'Joined team "Development Team"',
              timestamp: new Date(Date.now() - 86400000).toISOString(),
              timeAgo: '1 day ago'
            }
          ],
          stats: { totalActivities: 2, recentCount: 2 },
          lastLogin: new Date(Date.now() - 3600000).toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading activity data:', error);
      // Fallback with empty data
      setActivityData({
        activities: [],
        stats: { totalActivities: 0, recentCount: 0 },
        lastLogin: new Date().toISOString()
      });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setRememberMe(false);
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      // Use legacy compatibility endpoint already added
      const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: editedUsername,
          email: editedEmail
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update context user so avatar/name refresh across the app
        setUser(data.user);
        setIsEditing(false);
        setSuccess('Profile updated successfully!');
        loadProfileData();
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }
      
      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Password changed successfully!');
        setShowPasswordForm(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      handleUploadAvatar(file);
    }
  };

  const handleUploadAvatar = async (file = avatarFile) => {
    if (!file || isUploading) return;
    
    setIsUploading(true);
    setError('');
    setSuccess('');
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const updatedUser = { ...user, avatar_url: data.avatar_url };
        setUser(updatedUser);
        setAvatarFile(null);
        setAvatarPreview(data.avatar_url);
        setSuccess('Avatar uploaded successfully!');
      } else {
        setError(data.message || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteAccount = async () => {
    const password = prompt('Please enter your password to confirm account deletion:');
    if (!password) return;

    if (!window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently delete all your data.')) {
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Account deleted successfully. You will be logged out.');
        // Logout user
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        setRememberMe(false);
        navigate('/login');
        if (onClose) onClose();
      } else {
        setError(data.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setError('Failed to delete account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <FiUser className="w-10 h-10 text-white" />
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 cursor-pointer shadow-lg hover:shadow-xl transition-shadow">
              <FiCamera className="w-4 h-4 text-blue-600" />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarChange}
                disabled={isUploading}
              />
            </label>
          )}
        </div>
        
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editedUsername}
                onChange={(e) => setEditedUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                placeholder="Username"
              />
              <input
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                placeholder="Email"
              />
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{user?.username || 'User'}</h3>
              <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Member since {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {profileData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2">
              <FiFile className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Files</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{profileData.statistics.files}</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-2">
              <FiFolder className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-600 dark:text-green-400">Documents</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{profileData.statistics.documents}</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center space-x-2">
              <FiUsers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-purple-600 dark:text-purple-400">Teams</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{profileData.statistics.teams}</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center space-x-2">
              <FiCheckSquare className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm text-orange-600 dark:text-orange-400">Tasks</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{profileData.statistics.tasks}</p>
          </div>
        </div>
      )}

      {/* Storage Usage */}
      {profileData && (
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Storage Used</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(profileData.statistics.storageUsed)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((profileData.statistics.storageUsed / (1024 * 1024 * 100)) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">100 MB total storage</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        {isEditing ? (
          <>
            <button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedUsername(user?.username || '');
                setEditedEmail(user?.email || '');
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FiEdit3 className="w-4 h-4 inline mr-2" />
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );

  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'account_created':
      case 'account_login':
      case 'account_logout':
        return FiUser;
      case 'team_created':
      case 'team_joined':
      case 'team_left':
        return FiUsers;
      case 'file_uploaded':
      case 'file_downloaded':
        return FiFile;
      case 'document_created':
      case 'document_edited':
        return FiFolder;
      case 'profile_updated':
      case 'password_changed':
        return FiSettings;
      default:
        return FiActivity;
    }
  };

  const getActivityColor = (activityType) => {
    switch (activityType) {
      case 'account_created':
      case 'account_login':
        return 'text-green-600 dark:text-green-400';
      case 'team_joined':
      case 'team_created':
        return 'text-purple-600 dark:text-purple-400';
      case 'file_uploaded':
      case 'document_created':
        return 'text-blue-600 dark:text-blue-400';
      case 'password_changed':
      case 'profile_updated':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const renderActivity = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
        {activityData?.stats && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {activityData.stats.totalActivities} total activities
          </div>
        )}
      </div>
      
      {activityData ? (
        <div className="space-y-4">
          {/* Activity Feed */}
          <div>
            <div className="space-y-3">
              {activityData.activities && activityData.activities.length > 0 ? (
                activityData.activities.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.type);
                  const colorClass = getActivityColor(activity.type);
                  
                  return (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className={`p-2 rounded-full bg-white dark:bg-gray-600 ${colorClass}`}>
                        <ActivityIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {activity.timeAgo || formatDate(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <FiActivity className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No recent activities</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    Your activities will appear here as you use the platform
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Activity Stats */}
          {activityData.stats && activityData.stats.recentCount > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2">
                <FiBarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">This Week</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {activityData.stats.recentCount} activities in the last 7 days
              </p>
            </div>
          )}

          {/* Last Login */}
          {activityData.lastLogin && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2">
                <FiCalendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-900 dark:text-green-100">Last Login</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {formatDate(activityData.lastLogin)}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Loading activity...</p>
        </div>
      )}
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Security Settings</h3>
      
      {/* Change Password */}
      <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <FiShield className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Change Password</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Update your account password</p>
          </div>
        </div>
        
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Change Password
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
                placeholder="Enter new password"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
                placeholder="Confirm new password"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleChangePassword}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isLoading ? 'Changing...' : 'Change Password'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account Actions */}
      <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <FiTrash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Danger Zone</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Irreversible and destructive actions</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            <FiLogOut className="w-4 h-4 inline mr-2" />
            Logout
          </button>
          
          <button
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={handleDeleteAccount}
            disabled={isLoading}
          >
            <FiTrash2 className="w-4 h-4 inline mr-2" />
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error/Success Messages */}
        {(error || success) && (
          <div className={`px-6 py-3 ${error ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600' : 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-600'}`}>
            <p className={`text-sm ${error ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
              {error || success}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600 p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'overview' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-700 dark:border-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <FiUser className="w-5 h-5" />
                <span>Overview</span>
              </button>
              
              <button
                onClick={() => setActiveTab('activity')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'activity' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-700 dark:border-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <FiActivity className="w-5 h-5" />
                <span>Activity</span>
              </button>
              
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'security' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-700 dark:border-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <FiShield className="w-5 h-5" />
                <span>Security</span>
              </button>

              {/* Theme Toggle */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-600 mt-4">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
                  <ThemeToggle />
                </div>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-800">
            {isLoading && activeTab === 'overview' ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Loading profile...</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'activity' && renderActivity()}
                {activeTab === 'security' && renderSecurity()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 