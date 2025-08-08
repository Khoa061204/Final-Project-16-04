import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import UserSearch from '../components/UserSearch';
import { getApiUrl } from '../config/api';
import { getToken, getAuthHeaders } from '../utils/auth';
import { 
  MdAdd, 
  MdEdit, 
  MdDelete, 
  MdVisibility, 
  MdGroup,
  MdPublic,
  MdLock,
  MdPersonAdd,
  MdCheck,
  MdClose,
  MdSearch,
  MdFilterList,
  MdExitToApp,
  MdRemoveCircle,
  MdSettings,
  MdAnalytics,
  MdHistory,
  MdGroupAdd,
  MdTrendingUp
} from 'react-icons/md';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Cache for team data to improve performance
const teamCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const Teams = ({ teams = [], setTeams }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [newTeamVisibility, setNewTeamVisibility] = useState('private');
  const [pendingInvites, setPendingInvites] = useState([]);
  const [publicTeams, setPublicTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUsersForInvite, setSelectedUsersForInvite] = useState([]); // NEW: For user selection
  const [teamDetails, setTeamDetails] = useState(null);
  const [teamAnalytics, setTeamAnalytics] = useState(null);
  const [teamActivity, setTeamActivity] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Debug logging
  console.log('🎯 Teams component received:', { teamsCount: teams?.length, teams, user: user?.id });

  // Immediately set loading to false if teams are already available
  useEffect(() => {
    if (teams && teams.length > 0) {
      console.log('✅ Teams already available, setting loading to false immediately');
      setLoading(false);
    }
  }, [teams]);

  // Helper function to get authenticated headers with error handling
  const getAuthenticatedHeaders = () => {
    const token = getToken();
    if (!token) {
      console.error('❌ No token found');
      setError('Authentication required');
      return null;
    }
    console.log('✅ Token found, returning headers');
    return getAuthHeaders();
  };

  // Helper function to make authenticated API calls
  const makeAuthenticatedRequest = async (endpoint, options = {}) => {
    const headers = getAuthenticatedHeaders();
    if (!headers) return null;

    const response = await fetch(getApiUrl(endpoint), {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    return response;
  };

  // Performance: Memoized filtered teams
  const filteredTeams = useMemo(() => {
    console.log('🔍 Filtering teams:', { teams: teams?.length, searchTerm, filter, userId: user?.id });
    console.log('🔍 Teams data:', teams?.map(t => ({ id: t.id, name: t.name, visibility: t.visibility, user_status: t.user_status, creator_id: t.creator_id })));
    let filtered = teams || [];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(team => 
        team && team.name && team.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply filter type
    if (filter === 'my') {
      // Show only user's teams (created or member)
      filtered = filtered.filter(team => 
        team.creator_id === user?.id || 
        team.role || 
        team.user_status === 'creator' || 
        team.user_status === 'member'
      );
    }
    
    console.log('✅ Filtered teams result:', filtered.length);
    return filtered;
  }, [teams, searchTerm, filter, user?.id]);

  // Immediately set loading to false if teams are available
  useEffect(() => {
    if (teams.length > 0 && loading) {
      setLoading(false);
    }
  }, [teams.length, loading]);

  const filteredPublicTeams = useMemo(() => {
    // Get public teams that the user is not a member of
    const publicTeamsNotJoined = teams.filter(team => 
      team.visibility === 'public' && 
      team.user_status !== 'creator' && 
      team.user_status !== 'member' && 
      team.creator_id !== user?.id &&
      (!searchTerm || team.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    console.log('🌍 Public teams not joined:', publicTeamsNotJoined.length, publicTeamsNotJoined.map(t => ({ id: t.id, name: t.name, user_status: t.user_status })));
    return publicTeamsNotJoined;
  }, [teams, searchTerm, user?.id]);

  // Performance: Debounced search
  const debouncedSearch = useCallback(
    debounce((term) => {
      if (term.length > 0) {
        performAdvancedSearch(term);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    }
  }, [searchTerm, debouncedSearch]);

  // Fetch teams data - only if teams prop is empty
  useEffect(() => {
    console.log('🔍 Teams useEffect triggered:', { teamsLength: teams?.length, userId: user?.id, loading });
    
    // If teams are already available, immediately set loading to false
    if (teams && teams.length > 0) {
      console.log('✅ Teams already available, setting loading to false');
      setLoading(false);
      // Fetch invitations in background
      const fetchInvitations = async () => {
        try {
          const invitesResponse = await makeAuthenticatedRequest('/teams/invitations/list');
          if (invitesResponse && invitesResponse.ok) {
            const invitesData = await invitesResponse.json();
            setPendingInvites(invitesData.invitations || []);
          } else if (invitesResponse && invitesResponse.status === 400) {
            // Handle 400 error gracefully - might be no invitations or auth issue
            console.warn('No invitations found or authentication issue');
            setPendingInvites([]);
          } else {
            console.warn('Failed to fetch invitations:', invitesResponse?.status);
            setPendingInvites([]);
          }
        } catch (err) {
          console.warn('Failed to fetch invitations:', err);
          setPendingInvites([]);
        }
      };
      fetchInvitations();
      return;
    }

    // Only show loading if no teams and user is authenticated
    if (!user?.id) {
      console.log('⚠️ No user, setting loading to false');
      setLoading(false);
      setTeams([]);
      return;
    }

    // If teams are empty and user is authenticated, fetch teams
    if (teams.length === 0 && user?.id) {
      console.log('🔍 Fetching teams data...');
      const fetchTeamsData = async () => {
        setLoading(true);
        setError(null);

        try {
          // Fetch teams with timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 10000)
          );
          
          const teamsResponse = await Promise.race([
            makeAuthenticatedRequest('/teams'),
            timeoutPromise
          ]);
          
          if (teamsResponse && teamsResponse.ok) {
            const teamsData = await teamsResponse.json();
            console.log('📊 Teams API response:', teamsData);
            
            if (teamsData.success && teamsData.data) {
              // Combine created, member, and public teams
              const allTeams = [
                ...(teamsData.data.created || []),
                ...(teamsData.data.member || []),
                ...(teamsData.data.public || [])
              ];
              console.log('✅ Setting teams:', allTeams.length);
              setTeams(allTeams);
            } else if (teamsData.teams) {
              // Fallback for old API format
              console.log('✅ Setting teams from old format:', teamsData.teams.length);
              setTeams(teamsData.teams);
            } else if (Array.isArray(teamsData)) {
              // Fallback for array response
              console.log('✅ Setting teams from array:', teamsData.length);
              setTeams(teamsData);
            } else {
              console.warn('⚠️ Unexpected teams response format:', teamsData);
              setTeams([]);
            }
          } else {
            console.error('❌ Failed to fetch teams:', teamsResponse?.status);
            setError('Failed to fetch teams');
            setTeams([]);
          }

          // Fetch invitations
          const invitesResponse = await makeAuthenticatedRequest('/teams/invitations/list');
          if (invitesResponse && invitesResponse.ok) {
            const invitesData = await invitesResponse.json();
            setPendingInvites(invitesData.invitations || []);
          } else if (invitesResponse && invitesResponse.status === 400) {
            // Handle 400 error gracefully
            console.warn('No invitations found or authentication issue');
            setPendingInvites([]);
          } else {
            console.warn('Failed to fetch invitations:', invitesResponse?.status);
            setPendingInvites([]);
          }
          
        } catch (err) {
          console.error('❌ Error fetching teams data:', err);
          setError('Failed to load teams data. Please try again.');
          setTeams([]);
          setPendingInvites([]);
        } finally {
          console.log('✅ Setting loading to false');
          setLoading(false);
        }
      };

      fetchTeamsData();
    }
  }, [user?.id, teams.length]);

  // NEW FEATURE: Advanced search
  const performAdvancedSearch = async (query) => {
    try {
      const response = await makeAuthenticatedRequest(`/teams/search?query=${encodeURIComponent(query)}&type=all`);
      if (!response) return;

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update teams with search results
          setTeams(data.data);
        }
      }
    } catch (err) {
      console.warn('Advanced search failed:', err);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    
    if (!newTeamName.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      const response = await makeAuthenticatedRequest('/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: newTeamName,
          description: newTeamDescription,
          isPublic: newTeamVisibility === 'public'
        })
      });

      if (!response) return;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create team');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh teams data
        window.location.reload();
      }
      
      setShowCreateModal(false);
      setNewTeamName('');
      setNewTeamDescription('');
      setNewTeamVisibility('private');
      setError(null);

    } catch (err) {
      console.error('Error creating team:', err);
      setError(err.message || 'Failed to create team');
    }
  };

  const handleEditTeam = async (e) => {
    e.preventDefault();
    
    if (!newTeamName.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/teams/${selectedTeam.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newTeamName,
          description: newTeamDescription,
          visibility: newTeamVisibility
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update team');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh teams data
        window.location.reload();
      }
      
      setShowEditModal(false);
      setSelectedTeam(null);
      setError(null);

    } catch (err) {
      console.error('Error updating team:', err);
      setError(err.message || 'Failed to update team');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete team');
      }

      // Remove team from local state
      setTeams(teams.filter(team => team.id !== teamId));
    } catch (err) {
      console.error('Error deleting team:', err);
      setError(err.message || 'Failed to delete team');
    }
  };

  const handleLeaveTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to leave this team?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to leave team');
      }

      // Remove team from local state
      setTeams(teams.filter(team => team.id !== teamId));
    } catch (err) {
      console.error('Error leaving team:', err);
      setError(err.message || 'Failed to leave team');
    }
  };

  // NEW FEATURE: Enhanced invite user with multiple selection
  const handleInviteUsers = async (e) => {
    e.preventDefault();
    
    console.log('🔍 handleInviteUsers called with:', { selectedUsersForInvite, selectedTeam });
    
    if (selectedUsersForInvite.length === 0) {
      setError('Please select at least one user to invite');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const emails = selectedUsersForInvite.map(user => user.email);
      
      console.log('📧 Sending invitations for emails:', emails);
      console.log('👥 Selected users:', selectedUsersForInvite);
      
      const requestBody = { emails };
      console.log('📤 Request body:', requestBody);
      
      const response = await fetch(`${API_BASE_URL}/teams/${selectedTeam.id}/bulk-invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Invitation failed:', errorData);
        throw new Error(errorData.message || 'Failed to send invitations');
      }

      const data = await response.json();
      console.log('✅ Invitation response:', data);
      
      // Clear the modals and state
      setShowInviteModal(false);
      setShowBulkInviteModal(false);
      setSelectedUsersForInvite([]);
      setSelectedTeam(null);
      setError(null);
      
      // Show success message
      const successMessage = `${data.data.successful.length} invitations sent successfully!`;
      console.log('🎉 Showing success message:', successMessage);
      showSuccess(successMessage);
      
      if (data.data.failed.length > 0) {
        console.warn('Some invitations failed:', data.data.failed);
      }

    } catch (err) {
      console.error('Error sending invitations:', err);
      setError(err.message || 'Failed to send invitations');
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove member');
      }

      // Refresh team details if modal is open
      if (showDetailsModal && selectedTeam) {
        fetchTeamDetails(selectedTeam.id);
      }
      
      showSuccess('Member removed successfully!');

    } catch (err) {
      console.error('Error removing member:', err);
      setError(err.message || 'Failed to remove member');
    }
  };

  const fetchTeamDetails = async (teamId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team details');
      }

      const data = await response.json();
      if (data.success) {
        setTeamDetails(data.data);
      }
    } catch (err) {
      console.error('Error fetching team details:', err);
      setError('Failed to fetch team details');
    }
  };

  const openEditModal = (team) => {
    setSelectedTeam(team);
    setNewTeamName(team.name);
    setNewTeamDescription(team.description || '');
    setNewTeamVisibility(team.visibility);
    setShowEditModal(true);
  };

  const openDetailsModal = async (team) => {
    setSelectedTeam(team);
    setShowDetailsModal(true);
    await fetchTeamDetails(team.id);
  };

  const openInviteModal = (team) => {
    setSelectedTeam(team);
    setSelectedUsersForInvite([]);
    setShowInviteModal(true);
  };

  const handleAcceptInvitation = async (invitationId) => {
    try {
      const token = localStorage.getItem('token');
              const response = await fetch(`${API_BASE_URL}/teams/invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to accept invitation');
      }

      // Remove from pending invites and refresh teams
      setPendingInvites(pendingInvites.filter(invite => invite.id !== invitationId));
      // Refresh teams data
      window.location.reload();
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      const token = localStorage.getItem('token');
              const response = await fetch(`${API_BASE_URL}/teams/invitations/${invitationId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reject invitation');
      }

      setPendingInvites(pendingInvites.filter(invite => invite.id !== invitationId));
    } catch (err) {
      console.error('Error rejecting invitation:', err);
      setError('Failed to reject invitation');
    }
  };

  const handleJoinPublicTeam = async (teamId) => {
    try {
      console.log('🎯 Attempting to join team:', teamId);
      
      const response = await makeAuthenticatedRequest(`/teams/${teamId}/join`, {
        method: 'POST'
      });

      if (!response || !response.ok) {
        const errorData = await response?.json();
        throw new Error(errorData?.message || 'Failed to join team');
      }

      // Show success message
      showSuccess('Successfully joined the team!');
      console.log('✅ Successfully joined team:', teamId);
      
      // Refresh teams data by calling the parent's setTeams function
      if (setTeams) {
        // Fetch updated teams data
        const teamsResponse = await makeAuthenticatedRequest('/teams');
        if (teamsResponse && teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          if (teamsData.success && teamsData.data) {
            const allTeams = [
              ...(teamsData.data.created || []),
              ...(teamsData.data.member || []),
              ...(teamsData.data.public || [])
            ];
            setTeams(allTeams);
            console.log('🔄 Teams data refreshed after joining');
          }
        }
      } else {
        // Fallback: reload the page if setTeams is not available
        window.location.reload();
      }
    } catch (err) {
      console.error('❌ Error joining team:', err);
      setError(err.message || 'Failed to join team');
    }
  };

  // NEW FEATURE: Fetch team analytics
  const fetchTeamAnalytics = async (teamId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTeamAnalytics(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching team analytics:', err);
    }
  };

  // NEW FEATURE: Fetch team activity
  const fetchTeamActivity = async (teamId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/activity`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTeamActivity(data.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching team activity:', err);
    }
  };

  const openAnalyticsModal = async (team) => {
    setSelectedTeam(team);
    setShowAnalyticsModal(true);
    await fetchTeamAnalytics(team.id);
  };

  const openActivityModal = async (team) => {
    setSelectedTeam(team);
    setShowActivityModal(true);
    await fetchTeamActivity(team.id);
  };

  const openBulkInviteModal = (team) => {
    console.log('🔍 Opening bulk invite modal for team:', team);
    setSelectedTeam(team);
    setSelectedUsersForInvite([]);
    setShowBulkInviteModal(true);
  };

  // Show success message temporarily
  const showSuccess = (message) => {
    console.log('🎉 Success message:', message);
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Enhanced team cards with new features - MOVED INSIDE COMPONENT
  const TeamCard = ({ team }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center cursor-pointer" onClick={() => openDetailsModal(team)}>
            {team.visibility === 'public' ? (
              <MdPublic className="text-blue-500 mr-2" />
            ) : (
              <MdLock className="text-gray-500 mr-2" />
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {team.name}
            </h3>
          </div>
          <div className="flex space-x-1">
            {/* Analytics Button */}
            <button
              onClick={() => openAnalyticsModal(team)}
              className="text-purple-500 hover:text-purple-700 dark:hover:text-purple-400 p-1 transition-colors"
              title="View Analytics"
            >
              <MdAnalytics />
            </button>
            
            {/* Activity Button */}
            <button
              onClick={() => openActivityModal(team)}
              className="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-400 p-1 transition-colors"
              title="View Activity"
            >
              <MdHistory />
            </button>
            
            {/* View Details Button */}
            <button
              onClick={() => openDetailsModal(team)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 transition-colors"
              title="View Details"
            >
              <MdVisibility />
            </button>
            
            {/* Bulk Invite Button */}
            <button
              onClick={() => openBulkInviteModal(team)}
              className="text-green-500 hover:text-green-700 dark:hover:text-green-400 p-1 transition-colors"
              title="Bulk Invite"
            >
              <MdGroupAdd />
            </button>
            
            {/* Edit/Delete/Leave buttons */}
            {team.user_status === 'creator' || team.creator_id === user?.id ? (
              <>
                <button
                  onClick={() => openEditModal(team)}
                  className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 p-1 transition-colors"
                  title="Edit Team"
                >
                  <MdEdit />
                </button>
                <button
                  onClick={() => handleDeleteTeam(team.id)}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 transition-colors"
                  title="Delete Team"
                >
                  <MdDelete />
                </button>
              </>
            ) : team.user_status === 'member' || team.role ? (
              <button
                onClick={() => handleLeaveTeam(team.id)}
                className="text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 p-1 transition-colors"
                title="Leave Team"
              >
                <MdExitToApp />
              </button>
            ) : null}
          </div>
        </div>
        
        {team.description && (
          <p className="text-gray-600 dark:text-gray-200 mb-4 line-clamp-2">{team.description}</p>
        )}
        
        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
          <span className="flex items-center">
            <MdGroup className="mr-1" />
            {team.member_count || 0} members
          </span>
          <div className="flex items-center space-x-2">
            <span className="capitalize">{team.visibility}</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              team.user_status === 'creator' || team.role === 'admin'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                : team.user_status === 'member' || team.role
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {team.user_status === 'creator' ? 'Admin' : 
               team.user_status === 'member' ? 'Member' : 
               team.user_status === 'public' ? 'Public' : 
               team.role || 'None'}
            </span>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => navigate(`/teams/${team.id}`)}
              className="flex-1 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 flex items-center justify-center transition-colors"
            >
              <MdVisibility className="mr-1" /> View
            </button>
            {team.user_status === 'creator' || team.user_status === 'member' || team.creator_id === user?.id || team.role ? (
              // User is creator or member - show invite button
              <button
                onClick={() => openBulkInviteModal(team)}
                className="flex-1 bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                <MdGroupAdd className="mr-1" /> Invite
              </button>
            ) : team.visibility === 'public' && team.user_status !== 'creator' && team.user_status !== 'member' && team.creator_id !== user?.id ? (
              // User is not a member and team is public - show join button
              <button
                onClick={() => handleJoinPublicTeam(team.id)}
                className="flex-1 bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                <MdGroupAdd className="mr-1" /> Join
              </button>
            ) : team.visibility === 'private' && team.user_status === 'none' ? (
              // User is not a member and team is private - show disabled button
              <button
                disabled
                className="flex-1 bg-gray-400 text-white px-2 py-1 rounded text-xs cursor-not-allowed flex items-center justify-center"
              >
                <MdLock className="mr-1" /> Private
              </button>
            ) : (
              // Fallback - show invite button for members
              <button
                onClick={() => openBulkInviteModal(team)}
                className="flex-1 bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                <MdGroupAdd className="mr-1" /> Invite
              </button>
            )}
            <button
              onClick={() => openAnalyticsModal(team)}
              className="flex-1 bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600 flex items-center justify-center transition-colors"
            >
              <MdTrendingUp className="mr-1" /> Stats
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Loading skeleton component for better UX
  const TeamCardSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded mr-2"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
          </div>
          <div className="flex space-x-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
        <div className="flex justify-between items-center mb-3">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Only show loading skeleton if teams are empty and still loading
  if (loading && teams.length === 0) {
    return (
      <div className="container mx-auto p-6 bg-white dark:bg-gray-900 min-h-screen">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
          <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
        </div>

        {/* Search and Filter Skeleton */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 h-10 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
        </div>

        {/* Teams Grid Skeleton */}
        <div className="mb-8">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Teams</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 flex items-center shadow-md"
        >
          <MdAdd className="mr-2" />
          Create Team
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1 relative">
          <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Teams</option>
          <option value="my">My Teams</option>
          <option value="public">Public Teams</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Pending Team Invitations ({pendingInvites.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {invite.teamName || 'Team Invitation'}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {invite.teamDescription || 'You have been invited to join this team'}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAcceptInvitation(invite.id)}
                    className="flex-1 bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 flex items-center justify-center"
                  >
                    <MdCheck className="mr-1" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectInvitation(invite.id)}
                    className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 flex items-center justify-center"
                  >
                    <MdClose className="mr-1" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Teams */}
      {(filter === 'all' || filter === 'my') && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            My Teams ({filteredTeams.length})
          </h2>
          {filteredTeams.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-300 text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-200 mb-2">
                {loading && teams.length === 0 ? 'Loading teams...' : 'No teams yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-300 mb-4">
                {loading && teams.length === 0 ? 'Please wait while we load your teams' : 'Create your first team to start collaborating'}
              </p>
              {!loading && teams.length > 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Create Your First Team
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeams.map(team => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Public Teams */}
      {(filter === 'all' || filter === 'public') && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Public Teams ({filteredPublicTeams.length})
          </h2>
          {filteredPublicTeams.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-300 text-6xl mb-4">🌍</div>
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-200 mb-2">No public teams available</h3>
              <p className="text-gray-500 dark:text-gray-300">Check back later for public teams to join</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPublicTeams.map(team => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create New Team</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleCreateTeam}>
              <div className="mb-4">
                <label htmlFor="teamName" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Team Name:
                </label>
                <input
                  type="text"
                  id="teamName"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="teamDescription" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Description (Optional):
                </label>
                <textarea
                  id="teamDescription"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="3"
                ></textarea>
              </div>
              <div className="mb-4">
                <label htmlFor="teamVisibility" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Visibility:
                </label>
                <select
                  id="teamVisibility"
                  value={newTeamVisibility}
                  onChange={(e) => setNewTeamVisibility(e.target.value)}
                  className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>
              {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Create Team
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Team</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleEditTeam}>
              <div className="mb-4">
                <label htmlFor="editTeamName" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Team Name:
                </label>
                <input
                  type="text"
                  id="editTeamName"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="editTeamDescription" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Description (Optional):
                </label>
                <textarea
                  id="editTeamDescription"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="3"
                ></textarea>
              </div>
              <div className="mb-4">
                <label htmlFor="editTeamVisibility" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Visibility:
                </label>
                <select
                  id="editTeamVisibility"
                  value={newTeamVisibility}
                  onChange={(e) => setNewTeamVisibility(e.target.value)}
                  className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>
              {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {showDetailsModal && selectedTeam && teamDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{teamDetails.team?.name || selectedTeam.name}</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <MdClose />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">Description:</p>
                <p className="text-gray-900 dark:text-gray-100">{teamDetails.team?.description || 'No description provided.'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">Visibility:</p>
                <p className="text-gray-900 dark:text-gray-100 capitalize">{teamDetails.team?.visibility || 'private'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">Created By:</p>
                <p className="text-gray-900 dark:text-gray-100">{teamDetails.team?.creator_id ? `User ${teamDetails.team.creator_id}` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">Member Count:</p>
                <p className="text-gray-900 dark:text-gray-100">{teamDetails.members?.length || 0}</p>
              </div>
            </div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Members</h3>
              <button
                onClick={() => openInviteModal(selectedTeam)}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 flex items-center"
              >
                <MdPersonAdd className="mr-2" /> Invite Member
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {teamDetails.members && teamDetails.members.length > 0 ? (
                teamDetails.members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-2">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {member.username ? member.username.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{member.username || 'Unknown User'}</span>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{member.email || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        member.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {member.role}
                      </span>
                      {member.role !== 'admin' && teamDetails.user_role === 'admin' && (
                        <button
                          onClick={() => handleRemoveMember(selectedTeam.id, member.id)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1"
                          title="Remove Member"
                        >
                          <MdRemoveCircle />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No members found.</p>
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <div className="flex space-x-2">
                {teamDetails.user_role === 'admin' && (
                  <button
                    onClick={() => openEditModal(selectedTeam)}
                    className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 flex items-center"
                  >
                    <MdEdit className="mr-2" /> Edit Team
                  </button>
                )}
              </div>
              <div className="flex space-x-2">
                {teamDetails.user_role !== 'admin' && (
                  <button
                    onClick={() => handleLeaveTeam(selectedTeam.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 flex items-center"
                  >
                    <MdExitToApp className="mr-2" /> Leave Team
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Invite Members to {selectedTeam.name}</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleInviteUsers}>
              <UserSearch
                selectedUsers={selectedUsersForInvite}
                onUsersChange={setSelectedUsersForInvite}
                excludeTeamId={selectedTeam.id}
                placeholder="Search users to invite..."
              />
              {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
              <div className="flex items-center justify-between mt-4">
                <button
                  type="submit"
                  disabled={selectedUsersForInvite.length === 0}
                  className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                >
                  Send {selectedUsersForInvite.length} Invitation{selectedUsersForInvite.length !== 1 ? 's' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Invite Modal - Updated to use UserSearch */}
      {showBulkInviteModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                <MdGroupAdd className="inline mr-2" />
                Bulk Invite to {selectedTeam.name}
              </h2>
              <button
                onClick={() => setShowBulkInviteModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <MdClose />
              </button>
            </div>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                💡 <strong>Tip:</strong> Use the search to find multiple users at once. Selected users will appear as chips above.
              </p>
            </div>
            <form onSubmit={handleInviteUsers}>
              <UserSearch
                selectedUsers={selectedUsersForInvite}
                onUsersChange={setSelectedUsersForInvite}
                excludeTeamId={selectedTeam.id}
                placeholder="Search and select multiple users..."
              />
              {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedUsersForInvite.length > 0 && (
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                      {selectedUsersForInvite.length} user{selectedUsersForInvite.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkInviteModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={selectedUsersForInvite.length === 0}
                    className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors flex items-center"
                  >
                    <MdGroupAdd className="mr-2" />
                    Invite {selectedUsersForInvite.length || 'Users'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Analytics Modal */}
      {showAnalyticsModal && selectedTeam && teamAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Analytics for {selectedTeam.name}</h2>
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <MdClose />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">Total Members:</p>
                <p className="text-gray-900 dark:text-gray-100">{teamAnalytics.totalMembers || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">Active Members:</p>
                <p className="text-gray-900 dark:text-gray-100">{teamAnalytics.activeMembers || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">New Members Last 30 Days:</p>
                <p className="text-gray-900 dark:text-gray-100">{teamAnalytics.newMembersLast30Days || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">Total Activity:</p>
                <p className="text-gray-900 dark:text-gray-100">{teamAnalytics.totalActivity || 0}</p>
              </div>
            </div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {teamActivity.length > 0 ? (
                teamActivity.map((activity, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{activity.action} by {activity.user}</p>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{activity.timestamp}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent activity.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Activity Modal */}
      {showActivityModal && selectedTeam && teamActivity.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Activity for {selectedTeam.name}</h2>
              <button
                onClick={() => setShowActivityModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <MdClose />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {teamActivity.map((activity, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{activity.action} by {activity.user}</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{activity.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for debouncing
const debounce = (func, delay) => {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

export default Teams; 