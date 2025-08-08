import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import UserSearch from './UserSearch';
import { 
  MdClose, 
  MdShare, 
  MdPeople, 
  MdPerson,
  MdVisibility,
  MdEdit,
  MdSupervisorAccount,
  MdSchedule,
  MdMessage,
  MdGroup,
  MdPublic,
  MdLink,
  MdDelete,
  MdSettings
} from 'react-icons/md';

const API_BASE_URL = 'http://localhost:5000/api';

const ShareModal = ({ 
  isOpen, 
  onClose, 
  resourceType, 
  resourceId, 
  resourceName,
  onShareSuccess 
}) => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [permission, setPermission] = useState('view');
  const [message, setMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingShares, setExistingShares] = useState([]);
  const [showExistingShares, setShowExistingShares] = useState(false);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [shareStats, setShareStats] = useState(null);

  // Permission options
  const permissionOptions = [
    {
      value: 'view',
      label: 'View',
      icon: MdVisibility,
      description: 'Can view the item but not make changes'
    },
    {
      value: 'edit', 
      label: 'Edit',
      icon: MdEdit,
      description: 'Can view and edit the item'
    },
    {
      value: 'admin',
      label: 'Admin',
      icon: MdSupervisorAccount,
      description: 'Full control including sharing with others'
    }
  ];

  // Fetch user's teams for team sharing
  useEffect(() => {
    if (isOpen && activeTab === 'teams') {
      fetchUserTeams();
    }
  }, [isOpen, activeTab]);

  // Fetch existing shares when showing that tab
  useEffect(() => {
    if (isOpen && showExistingShares) {
      fetchExistingShares();
    }
  }, [isOpen, showExistingShares, resourceType, resourceId]);

  const fetchUserTeams = async () => {
    setLoadingTeams(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Combine created and member teams
          const allTeams = [
            ...(data.data.created || []),
            ...(data.data.member || [])
          ];
          setTeams(allTeams);
        }
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchExistingShares = async () => {
    try {
      console.log('🚀 fetchExistingShares START');
      console.log('📋 Props:', { resourceType, resourceId, resourceName });
      
      const token = localStorage.getItem('token');
      console.log('🔐 Token details:', {
        exists: !!token,
        length: token?.length,
        preview: token?.substring(0, 50) + '...',
        isString: typeof token === 'string'
      });
      
      if (!token) {
        console.log('❌ No token for fetchExistingShares');
        setError('Please log in to share items');
        return;
      }
      
      const url = `${API_BASE_URL}/shares/resource/${resourceType}/${resourceId}`;
      console.log('🔍 Request URL:', url);
      console.log('🔍 API_BASE_URL:', API_BASE_URL);
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      console.log('📡 Request headers:', {
        authHeader: headers.Authorization.substring(0, 60) + '...',
        contentType: headers['Content-Type']
      });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      console.log('📡 Response details:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Success data:', data);
        if (data.success) {
          setExistingShares(data.data);
        }
      } else {
        const errorData = await response.json();
        console.log('❌ Error details:', { 
          status: response.status, 
          statusText: response.statusText,
          errorData: errorData 
        });
        
        if (response.status === 401) {
          setError('Authentication expired. Please refresh and log in again.');
        } else if (response.status === 404) {
          console.log('📝 Resource not found - this might be normal for new shares');
        } else {
          setError(`Failed to load shares: ${errorData.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('❌ fetchExistingShares error:', error);
      console.error('❌ Error stack:', error.stack);
      setError('Network error while loading shares');
    }
  };

  const handleShare = async () => {
    console.log('🚀 handleShare called');
    console.log('👥 selectedUsers:', selectedUsers);
    console.log('🏢 selectedTeams:', selectedTeams);
    console.log('📊 selectedUsers.length:', selectedUsers.length);
    console.log('📊 selectedTeams.length:', selectedTeams.length);
    
    if (selectedUsers.length === 0 && selectedTeams.length === 0) {
      console.log('❌ Validation failed: No users or teams selected');
      setError('Please select at least one user or team to share with');
      return;
    }
    
    console.log('✅ Validation passed: Users or teams are selected');

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      console.log('🔐 Token check:', {
        tokenExists: !!token,
        tokenLength: token?.length,
        tokenPreview: token?.substring(0, 20) + '...'
      });
      console.log('🔗 Sharing request:', {
        url: `${API_BASE_URL}/shares`,
        resourceType,
        resourceId: resourceId, // Keep as string to support both integers and UUIDs
        users: selectedUsers,
        teams: selectedTeams,
        hasToken: !!token
      });
      
      if (!token) {
        setError('You are not logged in. Please log in and try again.');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      console.log('📡 Request headers:', {
        authorization: headers.Authorization?.substring(0, 30) + '...',
        contentType: headers['Content-Type']
      });
      
      const response = await fetch(`${API_BASE_URL}/shares`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          resourceType,
          resourceId: resourceId, // Keep as string to support both integers and UUIDs
          users: selectedUsers,
          teams: selectedTeams.map(team => ({ id: team.id })),
          permission,
          message: message.trim() || null,
          expiresAt: expiresAt || null
        })
      });

      const data = await response.json();
      console.log('📡 Share response:', { status: response.status, data });

      if (response.ok && data.success) {
        const { successful, failed, alreadyShared } = data.data;
        
        let successMsg = '';
        if (successful.length > 0) {
          const userCount = successful.filter(s => s.user).length;
          const teamCount = successful.filter(s => s.team).length;
          const parts = [];
          if (userCount > 0) parts.push(`${userCount} user${userCount !== 1 ? 's' : ''}`);
          if (teamCount > 0) parts.push(`${teamCount} team${teamCount !== 1 ? 's' : ''}`);
          successMsg = `Successfully shared with ${parts.join(' and ')}`;
        }

        if (alreadyShared.length > 0) {
          successMsg += alreadyShared.length > 0 ? 
            ` (${alreadyShared.length} already had access)` : '';
        }

        if (failed.length > 0) {
          successMsg += ` (${failed.length} failed)`;
        }

        setSuccess(successMsg);
        
        // Clear form
        setSelectedUsers([]);
        setSelectedTeams([]);
        setMessage('');
        setExpiresAt('');
        
        // Refresh existing shares if showing
        if (showExistingShares) {
          fetchExistingShares();
        }

        // Notify parent
        if (onShareSuccess) {
          onShareSuccess(data.data);
        }

      } else {
        console.log('❌ Share failed:', { status: response.status, data });
        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else if (response.status === 404) {
          setError('Share service not available. Please try again later.');
        } else {
          setError(data.message || 'Failed to share resource');
        }
      }

    } catch (error) {
      console.error('❌ Error sharing resource:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      });
      setError(`Failed to share: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/shares/${shareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSuccess('Share removed successfully');
        fetchExistingShares(); // Refresh the list
      }
    } catch (error) {
      console.error('Error removing share:', error);
      setError('Failed to remove share');
    }
  };

  const handleTeamToggle = (team) => {
    setSelectedTeams(prev => {
      const exists = prev.find(t => t.id === team.id);
      if (exists) {
        return prev.filter(t => t.id !== team.id);
      } else {
        return [...prev, team];
      }
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPermissionIcon = (perm) => {
    switch (perm) {
      case 'view': return MdVisibility;
      case 'edit': return MdEdit;
      case 'admin': return MdSupervisorAccount;
      default: return MdVisibility;
    }
  };

  const getPermissionColor = (perm) => {
    switch (perm) {
      case 'view': return 'text-blue-600 bg-blue-100';
      case 'edit': return 'text-green-600 bg-green-100';
      case 'admin': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <MdShare className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Share {resourceType}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {resourceName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MdClose size={24} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <MdPerson size={18} />
                <span>Share with Users</span>
              </button>
              
              <button
                onClick={() => setActiveTab('teams')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'teams'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <MdGroup size={18} />
                <span>Share with Teams</span>
              </button>

              <button
                onClick={() => setShowExistingShares(!showExistingShares)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showExistingShares
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <MdSettings size={18} />
                <span>Manage Access</span>
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Status Messages */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mx-6 mt-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {/* Share with Users Tab */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Select Users to Share With
                    </h3>
                    <UserSearch
                      selectedUsers={selectedUsers}
                      onUsersChange={setSelectedUsers}
                      placeholder="Search users by name or email..."
                    />
                  </div>

                  {/* Permission Selection */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Permission Level
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {permissionOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            onClick={() => setPermission(option.value)}
                            className={`p-4 border-2 rounded-lg text-left transition-all hover:border-blue-300 ${
                              permission === option.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2 mb-2">
                              <Icon size={20} className={`${permission === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
                              <span className={`font-medium ${permission === option.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                {option.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {option.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <MdMessage className="inline mr-1" size={16} />
                      Optional Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Add a message for the recipients..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Optional Expiry */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <MdSchedule className="inline mr-1" size={16} />
                      Access Expires (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Share with Teams Tab */}
              {activeTab === 'teams' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Select Teams to Share With
                    </h3>
                    
                    {loadingTeams ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {teams.length === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                            You're not a member of any teams yet.
                          </p>
                        ) : (
                          teams.map((team) => (
                            <div
                              key={team.id}
                              onClick={() => handleTeamToggle(team)}
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 ${
                                selectedTeams.find(t => t.id === team.id)
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                                  {team.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                    {team.name}
                                  </h4>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {team.member_count || 0} member{(team.member_count || 0) !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                {selectedTeams.find(t => t.id === team.id) && (
                                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Permission Selection for Teams */}
                  {selectedTeams.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Permission Level for Team Members
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        {permissionOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.value}
                              onClick={() => setPermission(option.value)}
                              className={`p-4 border-2 rounded-lg text-left transition-all hover:border-blue-300 ${
                                permission === option.value
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2 mb-2">
                                <Icon size={20} className={`${permission === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
                                <span className={`font-medium ${permission === option.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {option.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {option.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manage Access Tab */}
              {showExistingShares && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Current Access
                  </h3>

                  {existingShares.directShares?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                        <MdPerson className="mr-2" size={16} />
                        Direct Shares ({existingShares.directShares.length})
                      </h4>
                      <div className="space-y-2">
                        {existingShares.directShares.map((share) => {
                          const PermissionIcon = getPermissionIcon(share.permission);
                          return (
                            <div key={share.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                  {share.user.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {share.user.username}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {share.user.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPermissionColor(share.permission)}`}>
                                  <PermissionIcon size={12} className="mr-1" />
                                  {share.permission}
                                </span>
                                <button
                                  onClick={() => handleRemoveShare(share.id)}
                                  className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                                  title="Remove access"
                                >
                                  <MdDelete size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {existingShares.teamShares?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                        <MdGroup className="mr-2" size={16} />
                        Team Shares ({existingShares.teamShares.length})
                      </h4>
                      <div className="space-y-4">
                        {existingShares.teamShares.map((teamShare) => {
                          const PermissionIcon = getPermissionIcon(teamShare.permission);
                          return (
                            <div key={teamShare.team.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {teamShare.team.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                      {teamShare.team.name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {teamShare.members.length} member{teamShare.members.length !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPermissionColor(teamShare.permission)}`}>
                                  <PermissionIcon size={12} className="mr-1" />
                                  {teamShare.permission}
                                </span>
                              </div>
                              
                              {/* Team members */}
                              <div className="ml-13 space-y-2">
                                {teamShare.members.slice(0, 3).map((member) => (
                                  <div key={member.id} className="flex items-center space-x-2 text-sm">
                                    <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                      {member.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-gray-600 dark:text-gray-400">{member.username}</span>
                                    {member.lastAccessedAt && (
                                      <span className="text-gray-400 dark:text-gray-500 text-xs">
                                        • Last accessed {formatDate(member.lastAccessedAt)}
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {teamShare.members.length > 3 && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-8">
                                    +{teamShare.members.length - 3} more members
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(!existingShares.directShares?.length && !existingShares.teamShares?.length) && (
                    <div className="text-center py-12">
                      <MdPublic size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        This {resourceType} hasn't been shared with anyone yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {!showExistingShares && (
              <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedUsers.length > 0 && (
                    <span>{selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected</span>
                  )}
                  {selectedUsers.length > 0 && selectedTeams.length > 0 && <span>, </span>}
                  {selectedTeams.length > 0 && (
                    <span>{selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected</span>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={loading || (selectedUsers.length === 0 && selectedTeams.length === 0)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sharing...</span>
                      </>
                    ) : (
                      <>
                        <MdShare size={16} />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal; 