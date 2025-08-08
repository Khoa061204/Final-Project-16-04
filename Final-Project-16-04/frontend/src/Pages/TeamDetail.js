import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { getApiUrl, getAuthHeaders } from '../config/api';
import { 
  MdGroup, 
  MdEdit, 
  MdDelete, 
  MdPersonAdd, 
  MdExitToApp,
  MdSettings,
  MdArrowBack,
  MdPublic,
  MdLock,
  MdPerson,
  MdAdminPanelSettings
} from 'react-icons/md';
import TeamChat from '../components/TeamChat';

const TeamDetail = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sharedItems, setSharedItems] = useState({ items: [], loading: false, error: null });

  useEffect(() => {
    fetchTeamDetails();
  }, [teamId]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchTeamSharedItems();
    }
  }, [activeTab, teamId]);

  const fetchTeamDetails = async () => {
    try {
      const response = await fetch(getApiUrl(`/teams/${teamId}`), {
        headers: getAuthHeaders(localStorage.getItem('token'))
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team details');
      }

      const data = await response.json();
      setTeam(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamSharedItems = async () => {
    try {
      setSharedItems(prev => ({ ...prev, loading: true, error: null }));
      const response = await fetch(getApiUrl(`/teams/${teamId}/shared?limit=10`), {
        headers: getAuthHeaders(localStorage.getItem('token'))
      });
      if (!response.ok) {
        throw new Error('Failed to fetch shared items');
      }
      const data = await response.json();
      // Normalize items for UI usage
      const items = (data.data?.items || []).map(it => ({
        ...it,
        name: it.resourceName || it.name,
        type: it.resourceType,
        s3Key: it.s3Key || null
      }));
      setSharedItems({ items, loading: false, error: null });
    } catch (e) {
      setSharedItems({ items: [], loading: false, error: e.message });
    }
  };

  const handleLeaveTeam = async () => {
    if (!window.confirm('Are you sure you want to leave this team?')) return;

    try {
      const response = await fetch(getApiUrl(`/teams/${teamId}/leave`), {
        method: 'POST',
        headers: getAuthHeaders(localStorage.getItem('token'))
      });

      if (response.ok) {
        navigate('/teams');
      } else {
        alert('Failed to leave team');
      }
    } catch (err) {
      alert('Error leaving team');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-300 rounded mb-6"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error || 'Team not found'}</p>
            <button
              onClick={() => navigate('/teams')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Back to Teams
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = team.user_role === 'admin';
  const isMember = team.members?.some(m => m.id === user.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/teams')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <MdArrowBack className="text-xl text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
                  <MdGroup className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{team.team?.name}</h1>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    {team.team?.visibility === 'public' ? (
                      <><MdPublic className="text-sm" /> Public Team</>
                    ) : (
                      <><MdLock className="text-sm" /> Private Team</>
                    )}
                    <span>•</span>
                    <span>{team.members?.length || 0} members</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <MdSettings className="text-lg" />
                  Settings
                </button>
              )}
              {isMember && !isAdmin && (
                <button
                  onClick={handleLeaveTeam}
                  className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <MdExitToApp className="text-lg" />
                  Leave Team
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex gap-8">
            {['overview', 'chat', 'members', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">About</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {team.team?.description || 'No description provided for this team.'}
                </p>
              </div>

              {/* Recently shared with team */}
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Shared with this team</h3>
                  <button
                    onClick={fetchTeamSharedItems}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Refresh
                  </button>
                </div>

                {sharedItems.loading && (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Loading...
                  </div>
                )}

                {sharedItems.error && (
                  <div className="text-sm text-red-600">{sharedItems.error}</div>
                )}

                {!sharedItems.loading && !sharedItems.error && sharedItems.items.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400">No items have been shared with this team yet.</p>
                )}

                <div className="space-y-3">
                  {sharedItems.items.map(item => (
                    <div key={`${item.resourceType}-${item.resourceId}-${item.shareId}`} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200 capitalize">
                          {item.resourceType?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.resourceName || `${item.resourceType} #${item.resourceId}`}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            by {item.owner?.username || 'Unknown'} • {new Date(item.sharedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.resourceType === 'document' && (
                          <>
                            <button
                              onClick={() => navigate(`/documents/${item.resourceId}`)}
                              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View
                            </button>
                          </>
                        )}
                        {item.resourceType === 'file' && (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  if (!item.s3Key) {
                                    if (item.resourceUrl) {
                                      window.open(item.resourceUrl, '_blank');
                                      return;
                                    }
                                    alert('This file is missing a valid S3 key and cannot be viewed.');
                                    return;
                                  }
                                  const res = await fetch(`${getApiUrl('files')}/signed-url?key=${encodeURIComponent(item.s3Key)}`, {
                                    headers: getAuthHeaders(localStorage.getItem('token'))
                                  });
                                  if (!res.ok) {
                                    const errData = await res.json().catch(() => ({}));
                                    throw new Error(errData.message || `Failed to get signed URL (${res.status})`);
                                  }
                                  const { url } = await res.json();
                                  window.open(url, '_blank');
                                } catch (err) {
                                  alert(err.message || 'Failed to view file');
                                }
                              }}
                              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  if (!item.s3Key) {
                                    if (item.resourceUrl) {
                                      const a = document.createElement('a');
                                      a.href = item.resourceUrl;
                                      a.download = item.resourceName || 'file';
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      return;
                                    }
                                    alert('This file is missing a valid S3 key and cannot be downloaded.');
                                    return;
                                  }
                                  // Use direct download endpoint
                                  const downloadUrl = `${getApiUrl('files')}/download?key=${encodeURIComponent(item.s3Key)}`;
                                  const a = document.createElement('a');
                                  a.href = downloadUrl;
                                  a.download = item.resourceName || 'file';
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                } catch (err) {
                                  alert(err.message || 'Failed to download');
                                }
                              }}
                              className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            >
                              Download
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Info</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Created</span>
                    <p className="text-gray-900 dark:text-white">
                      {team.team?.createdAt ? new Date(team.team.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Visibility</span>
                    <p className="text-gray-900 dark:text-white capitalize">{team.team?.visibility || 'private'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Your Role</span>
                    <p className="text-gray-900 dark:text-white capitalize">{team.user_role || 'member'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <TeamChat teams={[team.team]} user={user} />
        )}

        {activeTab === 'members' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Members ({team.members?.length || 0})
                </h2>
                {isAdmin && (
                  <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <MdPersonAdd className="text-lg" />
                    Invite Members
                  </button>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {team.members?.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {(member.username || member.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {member.username || member.email}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        {member.role === 'admin' ? (
                          <><MdAdminPanelSettings className="text-sm" /> Admin</>
                        ) : member.role === 'moderator' ? (
                          <><MdSettings className="text-sm" /> Moderator</>
                        ) : (
                          <><MdPerson className="text-sm" /> Member</>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && isAdmin && (
          <div className="space-y-6">
            {/* Team Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Settings</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your team's configuration and preferences</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Team Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Team Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Team Name</label>
                      <p className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                        {team.team?.name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visibility</label>
                      <p className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white capitalize">
                        {team.team?.visibility}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                    <p className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                      {team.team?.description || 'No description provided'}
                    </p>
                  </div>
                </div>

                {/* Team Statistics */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Team Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="flex items-center">
                        <MdGroup className="text-blue-600 text-xl mr-3" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Members</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{team.members?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <div className="flex items-center">
                        <MdAdminPanelSettings className="text-green-600 text-xl mr-3" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Admins</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {team.members?.filter(m => m.role === 'admin').length || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                      <div className="flex items-center">
                        <MdSettings className="text-purple-600 text-xl mr-3" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Moderators</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {team.members?.filter(m => m.role === 'moderator').length || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div>
                  <h3 className="text-md font-medium text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
                  <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-red-800 dark:text-red-200">Delete Team</h4>
                        <p className="text-sm text-red-600 dark:text-red-400">Once you delete a team, there is no going back. Please be certain.</p>
                      </div>
                      <button 
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
                            try {
                              const response = await fetch(getApiUrl(`/teams/${teamId}`), {
                                method: 'DELETE',
                                headers: getAuthHeaders(localStorage.getItem('token'))
                              });

                              if (response.ok) {
                                navigate('/teams');
                              } else {
                                const errorData = await response.json();
                                alert(errorData.message || 'Failed to delete team');
                              }
                            } catch (err) {
                              alert('Error deleting team');
                            }
                          }
                        }}
                      >
                        Delete Team
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && !isAdmin && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
            <MdLock className="mx-auto text-yellow-600 text-4xl mb-4" />
            <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">Access Restricted</h3>
            <p className="text-yellow-700 dark:text-yellow-300">Only team administrators can access team settings.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDetail;