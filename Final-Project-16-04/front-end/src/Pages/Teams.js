import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import Topbar from '../components/Topbar';
import { FiPlus, FiUsers, FiTrash2, FiUserPlus, FiUserMinus, FiArrowUp, FiArrowDown } from 'react-icons/fi';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Teams = ({ teams, setTeams }) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [toast, setToast] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsTeam, setDetailsTeam] = useState(null);
  const handleShowDetails = (team) => {
    setDetailsTeam(team);
    setShowDetailsModal(true);
  };

  useEffect(() => {
    fetchTeams();
    fetchInvites();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch teams');
      }

      const data = await response.json();
      setTeams(data.teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError(error.message || 'Failed to fetch teams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/teams/invitations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingInvites(data.invitations || []);
      }
    } catch (err) {
      // ignore
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: newTeamName })
      });
      if (!response.ok) throw new Error('Failed to create team');
      await fetchTeams();
      setShowCreateModal(false);
      setNewTeamName('');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedTeam || !(selectedTeam.id || selectedTeam._id)) {
      setError("No team selected for invitation.");
      return;
    }
    const teamId = selectedTeam.id || selectedTeam._id;
    try {
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ email: memberEmail })
      });
      if (!response.ok) throw new Error('Failed to send invitation');
      showToast('Invitation sent!');
      setShowAddMemberModal(false);
      setMemberEmail('');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleRemoveMember = async (teamId, memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to remove member');
      await fetchTeams();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    setShowDeleteModal(false);
    setTeamToDelete(null);
    if (!teamId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete team');
      await fetchTeams();
      showToast('Team deleted successfully');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleLeaveTeam = async (teamId) => {
    if (!teamId) {
      setError("No team selected to leave.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to leave team');
      await fetchTeams();
      showToast('Left team successfully');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    if (!inviteId) {
      setError('Invalid invitation.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/teams/invitations/${inviteId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to accept invitation');
      setPendingInvites(pendingInvites.filter(inv => inv.id !== inviteId));
      fetchTeams();
      showToast('Joined team!');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleRejectInvite = async (inviteId) => {
    if (!inviteId) {
      setError('Invalid invitation.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/teams/invitations/${inviteId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to reject invitation');
      setPendingInvites(pendingInvites.filter(inv => inv.id !== inviteId));
      showToast('Invitation rejected.');
    } catch (error) {
      setError(error.message);
    }
  };

  // Promote/demote member
  const handlePromote = async (teamId, memberId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${memberId}/promote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to promote member');
      await fetchTeams();
      showToast('Promoted to admin');
    } catch (error) { setError(error.message); }
  };
  const handleDemote = async (teamId, memberId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${memberId}/demote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to demote member');
      await fetchTeams();
      showToast('Demoted to user');
    } catch (error) { setError(error.message); }
  };

  return (
    <div className="h-full">
      <main className="h-full">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">My Teams</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors duration-200"
            >
              <FiPlus className="mr-2" />
              Create Team
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <button
                    onClick={fetchTeams}
                    className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pending invitations section */}
          {pendingInvites.length > 0 && (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h2 className="text-lg font-semibold mb-3 text-yellow-800">Pending Team Invitations</h2>
              <ul className="space-y-2">
                {pendingInvites.map(invite => (
                  <li key={invite.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                    <span className="text-gray-700 font-medium">{invite.teamName}</span>
                    <div className="space-x-2">
                      <button 
                        onClick={() => handleAcceptInvite(invite.id)} 
                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleRejectInvite(invite.id)} 
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading-spinner"></div>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No teams</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new team.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map(team => (
                <div key={team._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3
                          className="text-lg font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline transition-colors duration-200"
                          onClick={() => handleShowDetails(team)}
                        >
                          {team.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {team.members?.length || 0} members
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedTeam(team);
                            setShowAddMemberModal(true);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                          title="Add member"
                        >
                          <FiUserPlus className="w-5 h-5" />
                        </button>
                        {team.creatorId === user.id && (
                          <button
                            onClick={() => { setTeamToDelete(team.id); setShowDeleteModal(true); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete team"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        )}
                        {team.creatorId !== user.id && (
                          <button
                            onClick={() => handleLeaveTeam(team.id)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors duration-200"
                            title="Leave team"
                          >
                            <FiUserMinus className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Members</h4>
                      <div className="space-y-3">
                        {team.members?.map(member => (
                          <div key={member.id || member._id} className="flex items-center justify-between group">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                                {member.avatar_url ? (
                                  <img 
                                    src={member.avatar_url} 
                                    alt={`${member.name}'s avatar`} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-primary">
                                    {member.name?.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="text-sm text-gray-900">{member.name}</span>
                                {/* Role badge */}
                                {member.role === 'creator' && (
                                  <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Creator</span>
                                )}
                                {member.role === 'admin' && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Admin</span>
                                )}
                                {member.role === 'user' && (
                                  <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">User</span>
                                )}
                                {member.status === 'pending' && (
                                  <span className="ml-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                                    pending
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {team.creatorId === user.id && member.id !== team.creatorId && member.id !== user.id && (
                                <>
                                  {member.role === 'user' && (
                                    <button
                                      onClick={() => handlePromote(team.id || team._id, member.id || member._id)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                      title="Promote to admin"
                                    >
                                      <FiArrowUp className="w-4 h-4" />
                                    </button>
                                  )}
                                  {member.role === 'admin' && (
                                    <button
                                      onClick={() => handleDemote(team.id || team._id, member.id || member._id)}
                                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                      title="Demote to user"
                                    >
                                      <FiArrowDown className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleRemoveMember(team.id || team._id, member.id || member._id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                    title="Remove member"
                                  >
                                    <FiUserMinus className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">Create New Team</h2>
            <form onSubmit={handleCreateTeam}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter team name"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">Add Member to {selectedTeam.name}</h2>
            <form onSubmit={handleAddMember}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter member's email"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow z-50">{toast}</div>
      )}

      {/* Confirmation Modal for Delete */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4 text-red-700">Delete Team</h2>
            <p className="mb-4 text-gray-700">Are you sure you want to delete this team? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setShowDeleteModal(false); setTeamToDelete(null); }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTeam(teamToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {showDetailsModal && detailsTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[420px] max-w-full shadow-lg relative">
            <button
              onClick={() => setShowDetailsModal(false)}
              className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-700"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">{detailsTeam.name}</h2>
            <div className="mb-4 text-sm text-gray-500">Team ID: {detailsTeam.id || detailsTeam._id}</div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Members</h4>
            <div className="space-y-3">
              {detailsTeam.members?.map(member => (
                <div key={member.id || member._id} className="flex items-center justify-between group">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={`${member.name}'s avatar`} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-primary">
                          {member.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-sm text-gray-900">{member.name}</span>
                      {member.role === 'creator' && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Creator</span>
                      )}
                      {member.role === 'admin' && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Admin</span>
                      )}
                      {member.role === 'user' && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">User</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {detailsTeam.creatorId === user.id && member.id !== detailsTeam.creatorId && member.id !== user.id && (
                      <>
                        {member.role === 'user' && (
                          <button
                            onClick={() => handlePromote(detailsTeam.id || detailsTeam._id, member.id || member._id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Promote to admin"
                          >
                            <FiArrowUp className="w-4 h-4" />
                          </button>
                        )}
                        {member.role === 'admin' && (
                          <button
                            onClick={() => handleDemote(detailsTeam.id || detailsTeam._id, member.id || member._id)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                            title="Demote to user"
                          >
                            <FiArrowDown className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(detailsTeam.id || detailsTeam._id, member.id || member._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Remove member"
                        >
                          <FiUserMinus className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams; 