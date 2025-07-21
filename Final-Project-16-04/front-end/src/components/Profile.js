import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { FiUser, FiMail, FiSettings, FiLogOut, FiCamera } from 'react-icons/fi';

const Profile = ({ onClose }) => {
  const { user, setUser, setIsAuthenticated, setRememberMe } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedEmail, setEditedEmail] = useState(user?.email || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setRememberMe(false);
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleSaveProfile = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const userId = user?.id;
      
      console.log('API URL:', apiUrl);
      console.log('User ID:', userId);
      console.log('Full URL:', `${apiUrl}/users/${userId}`);
      
      const response = await fetch(`${apiUrl}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: editedName,
          email: editedEmail
        })
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const updatedUser = await response.json();
        console.log('Updated user data:', updatedUser);
        setUser(updatedUser.user);
        setIsEditing(false);
      } else {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        throw new Error(`Failed to update profile: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      // Automatically upload the avatar when a file is selected
      handleUploadAvatar(file);
    }
  };

  const handleUploadAvatar = async (file = avatarFile) => {
    if (!file || isUploading) return;
    
    console.log('Starting avatar upload for file:', file.name);
    console.log('Current user:', user);
    console.log('User ID type:', typeof user?.id);
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const uploadUrl = `${apiUrl}/users/${user.id}/avatar`;
      
      console.log('Uploading to:', uploadUrl);
      console.log('User ID:', user.id);
      console.log('Token exists:', !!localStorage.getItem('token'));
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        // Update the user state with the new avatar URL
        const updatedUser = { ...user, avatar_url: data.avatar_url };
        setUser(updatedUser);
        setAvatarFile(null);
        setAvatarPreview(data.avatar_url);
        console.log('Avatar uploaded successfully:', data.avatar_url);
        alert('Avatar uploaded successfully!');
      } else {
        throw new Error(data.message || `Failed to upload avatar: ${response.status}`);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-80">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <FiUser className="w-8 h-8 text-white" />
            )}
            {isEditing && (
              <label className={`absolute bottom-0 right-0 bg-white rounded-full p-1 cursor-pointer shadow ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <FiCamera className="w-4 h-4 text-indigo-600" />
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
          {isEditing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your name"
            />
          ) : (
            <div>
              <h3 className="font-medium text-gray-900">{user?.name || 'User'}</h3>
              <p className="text-sm text-gray-500">{user?.email || 'user@example.com'}</p>
            </div>
          )}
        </div>

        {isEditing && avatarFile && (
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-sm text-gray-500">
              {isUploading ? 'Uploading avatar...' : 'Avatar selected'}
            </span>
            <button
              onClick={() => { setAvatarFile(null); setAvatarPreview(user?.avatar_url || null); }}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-xs"
              disabled={isUploading}
            >
              Cancel
            </button>
          </div>
        )}

        {isEditing && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="your@email.com"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSaveProfile}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="space-y-2">
            <button
              onClick={() => setIsEditing(true)}
              className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
            >
              <FiSettings className="w-5 h-5" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
            >
              <FiLogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 