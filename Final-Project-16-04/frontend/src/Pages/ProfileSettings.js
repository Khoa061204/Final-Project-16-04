import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from '../App';
import { getApiUrl, getAuthHeaders } from '../config/api';
import { 
  MdPerson, 
  MdEmail, 
  MdLock, 
  MdCamera, 
  MdSave,
  MdCancel,
  MdEdit,
  MdCheck,
  MdClose
} from 'react-icons/md';

const ProfileSettings = () => {
  const { user, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editMode, setEditMode] = useState({
    name: false,
    email: false,
    password: false
  });
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const fileInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const toggleEditMode = (field) => {
    setEditMode(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
    
    // Reset form data when canceling
    if (editMode[field]) {
      setFormData(prev => ({
        ...prev,
        username: user?.username || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    }
  };

  const updateProfile = async (field) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {};
      
      if (field === 'name') {
        payload.username = formData.username;
      } else if (field === 'email') {
        payload.email = formData.email;
      } else if (field === 'password') {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        if (formData.newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters');
        }
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/users/profile'), {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update local user data
      if (field === 'name' || field === 'email') {
        setUser(prev => ({
          ...prev,
          ...payload
        }));
      }

      setSuccess(`${field === 'name' ? 'Name' : field === 'email' ? 'Email' : 'Password'} updated successfully`);
      toggleEditMode(field);
      
      // Clear password fields
      if (field === 'password') {
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Image size must be less than 5MB');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/users/profile-picture'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload profile picture');
      }

      // Update user with new profile picture URL
      setUser(prev => ({
        ...prev,
        profilePicture: data.profilePictureUrl
      }));

      setSuccess('Profile picture updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account information and preferences</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400">
              <p className="text-green-800 dark:text-green-200">{success}</p>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Profile Picture */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Picture</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (user?.username || user?.email || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                  disabled={loading}
                >
                  <MdCamera className="text-sm" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {user?.username || user?.email}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Upload a new profile picture (max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Name Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Display Name</h2>
              <button
                onClick={() => toggleEditMode('name')}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                {editMode.name ? <MdClose /> : <MdEdit />}
                {editMode.name ? 'Cancel' : 'Edit'}
              </button>
            </div>
            
            {editMode.name ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your username"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateProfile('name')}
                    disabled={loading || !formData.username.trim()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <MdCheck /> Save
                  </button>
                  <button
                    onClick={() => toggleEditMode('name')}
                    className="flex items-center gap-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    <MdCancel /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <MdPerson className="text-gray-400" />
                <span className="text-gray-900 dark:text-white">{user?.username || 'Not set'}</span>
              </div>
            )}
          </div>

          {/* Email Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Address</h2>
              <button
                onClick={() => toggleEditMode('email')}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                {editMode.email ? <MdClose /> : <MdEdit />}
                {editMode.email ? 'Cancel' : 'Edit'}
              </button>
            </div>
            
            {editMode.email ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your email"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateProfile('email')}
                    disabled={loading || !formData.email.trim()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <MdCheck /> Save
                  </button>
                  <button
                    onClick={() => toggleEditMode('email')}
                    className="flex items-center gap-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    <MdCancel /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <MdEmail className="text-gray-400" />
                <span className="text-gray-900 dark:text-white">{user?.email}</span>
              </div>
            )}
          </div>

          {/* Password Section */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Password</h2>
              <button
                onClick={() => toggleEditMode('password')}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                {editMode.password ? <MdClose /> : <MdEdit />}
                {editMode.password ? 'Cancel' : 'Change'}
              </button>
            </div>
            
            {editMode.password ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateProfile('password')}
                    disabled={loading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <MdCheck /> Update Password
                  </button>
                  <button
                    onClick={() => toggleEditMode('password')}
                    className="flex items-center gap-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    <MdCancel /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <MdLock className="text-gray-400" />
                <span className="text-gray-900 dark:text-white">••••••••</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;