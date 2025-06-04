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

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setRememberMe(false);
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/profile`, {
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

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setIsEditing(false);
      } else {
        throw new Error('Failed to update profile');
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
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/${user.id}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setUser({ ...user, avatar_url: data.avatar_url });
        setAvatarFile(null);
        setAvatarPreview(data.avatar_url);
      } else {
        throw new Error(data.message || 'Failed to upload avatar');
      }
    } catch (error) {
      alert(error.message);
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
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-1 cursor-pointer shadow">
                <FiCamera className="w-4 h-4 text-indigo-600" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
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
            <button
              onClick={handleUploadAvatar}
              className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
            >
              Upload Avatar
            </button>
            <button
              onClick={() => { setAvatarFile(null); setAvatarPreview(user?.avatar_url || null); }}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-xs"
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