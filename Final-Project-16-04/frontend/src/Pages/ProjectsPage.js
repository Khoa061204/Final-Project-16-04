import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { MdAdd, MdVisibility, MdDelete, MdGroup, MdSchedule, MdPeople, MdShare } from 'react-icons/md';
import ShareModal from '../components/ShareModal';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import { getApiUrl } from '../config/api';
import { getToken, getAuthHeaders } from '../utils/auth';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [newProjectDueDate, setNewProjectDueDate] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Fetch projects and teams on mount
  useEffect(() => {
    const fetchData = async () => {
      console.log('🔍 ProjectsPage: Starting fetchData, user:', user);
      
      if (!user) {
        console.log('⚠️ ProjectsPage: No user, skipping fetch');
        setLoading(false);
        setProjects([]);
        setTeams([]);
        return;
      }
      
      setLoading(true);
      setError('');
      
      const token = getToken();
      if (!token) {
        console.error('❌ ProjectsPage: No token found');
        setError('Authentication required');
        setLoading(false);
        setProjects([]);
        setTeams([]);
        return;
      }
      
      try {
        console.log('🔍 ProjectsPage: Fetching projects and teams...');
        // Fetch projects and teams in parallel with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const [projectsResponse, teamsResponse] = await Promise.allSettled([
          Promise.race([
            fetch(getApiUrl('projects'), {
              headers: getAuthHeaders()
            }),
            timeoutPromise
          ]),
          Promise.race([
            fetch(getApiUrl('teams'), {
              headers: getAuthHeaders()
            }),
            timeoutPromise
          ])
        ]);

        // Handle projects response
        if (projectsResponse.status === 'fulfilled' && projectsResponse.value.ok) {
          const projectsData = await projectsResponse.value.json();
          console.log('📊 Projects API response:', projectsData);
          
          if (projectsData.success && projectsData.projects) {
            console.log('✅ Setting projects from success.projects:', projectsData.projects.length);
            setProjects(projectsData.projects);
          } else if (projectsData.projects) {
            // Fallback for old API format
            console.log('✅ Setting projects from projects:', projectsData.projects.length);
            setProjects(projectsData.projects);
          } else if (Array.isArray(projectsData)) {
            // Fallback for array response
            console.log('✅ Setting projects from array:', projectsData.length);
            setProjects(projectsData);
          } else {
            console.warn('⚠️ Unexpected projects response format:', projectsData);
            setProjects([]);
          }
        } else {
          console.error('❌ Failed to fetch projects:', projectsResponse);
          const errorMessage = projectsResponse.reason?.message || 'Failed to fetch projects';
          setError(errorMessage);
          setProjects([]);
        }

        // Handle teams response
        if (teamsResponse.status === 'fulfilled' && teamsResponse.value.ok) {
          const teamsData = await teamsResponse.value.json();
          console.log('👥 Teams API response:', teamsData);
          
          if (teamsData.success && teamsData.data) {
            // Combine created, member, and public teams
            const allTeams = [
              ...(teamsData.data.created || []),
              ...(teamsData.data.member || []),
              ...(teamsData.data.public || [])
            ];
            setTeams(allTeams);
          } else if (teamsData.teams) {
            // Fallback for old API format
            setTeams(teamsData.teams);
          } else if (Array.isArray(teamsData)) {
            // Fallback for array response
            setTeams(teamsData);
          } else {
            console.warn('⚠️ Unexpected teams response format:', teamsData);
            setTeams([]);
          }
        } else {
          console.error('❌ Failed to fetch teams:', teamsResponse);
          // Don't set error for teams as it's not critical for viewing projects
          console.warn('⚠️ Teams fetch failed, but continuing...');
          setTeams([]);
        }

      } catch (err) {
        console.error('❌ Error fetching data:', err);
        setError('Failed to load data. Please try again.');
        setProjects([]);
        setTeams([]);
      } finally {
        console.log('✅ ProjectsPage: Setting loading to false');
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]); // Only depend on user.id to prevent unnecessary re-renders

  // Create project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName || !selectedTeamId) {
      setError('Please fill in all required fields');
      return;
    }

    setCreateLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        setCreateLoading(false);
        return;
      }

      const response = await fetch(getApiUrl('projects'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          teamId: parseInt(selectedTeamId),
          dueDate: newProjectDueDate,
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newProject = data.project || data;
        
        // Add team name to the project
        const team = teams.find(t => t.id === parseInt(selectedTeamId));
        if (team) {
          newProject.teamName = team.name;
        }
        
        setProjects([newProject, ...projects]);
        setShowCreateModal(false);
        setNewProjectName('');
        setNewProjectDescription('');
        setSelectedTeamId('');
        setNewProjectDueDate('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create project');
      }
    } catch (err) {
      console.error('❌ Error creating project:', err);
      setError('Failed to create project. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(getApiUrl(`projects/${projectId}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete project');
      }
    } catch (err) {
      console.error('❌ Error deleting project:', err);
      setError('Failed to delete project. Please try again.');
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Handle project sharing
  const handleShareProject = (project) => {
    console.log('📤 Sharing project:', project);
    setShareTarget(project);
    setShowShareModal(true);
  };

  // Helper function to get progress color
  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Keyboard shortcuts
  const handleNewProjectShortcut = () => setShowCreateModal(true);
  const handleEscapeShortcut = () => {
    if (showCreateModal) setShowCreateModal(false);
    if (showShortcutsHelp) setShowShortcutsHelp(false);
  };
  const handleRefreshShortcut = () => window.location.reload();

  useKeyboardShortcuts({
    onNewDocument: handleNewProjectShortcut,
    onRefresh: handleRefreshShortcut,
    onEscape: handleEscapeShortcut,
    isSelectionMode: false,
    selectedItems: []
  });

  return (
    <div className="container mx-auto p-6 bg-white dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Projects</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowShortcutsHelp(true)}
            className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors rounded-lg border border-gray-300 dark:border-gray-600"
            title="Keyboard Shortcuts (Ctrl + ?)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 flex items-center shadow-md transition-colors"
          >
            <MdAdd className="mr-2" />
            Create New Project
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
          <button 
            onClick={() => setError('')}
            className="float-right text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading projects...</span>
        </div>
      ) : (
        <>
          {/* Projects Grid */}
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <div key={project.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 group">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{project.name}</h2>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 p-1 transition-colors"
                          title="View Project"
                        >
                          <MdVisibility />
                        </button>
                        <button
                          onClick={() => handleShareProject(project)}
                          className="text-green-500 hover:text-green-700 dark:hover:text-green-400 p-1 transition-colors"
                          title="Share Project"
                        >
                          <MdShare />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 transition-colors"
                          title="Delete Project"
                        >
                          <MdDelete />
                        </button>
                      </div>
                    </div>
                    
                    {project.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Team Info */}
                    {project.teamName && (
                      <div className="flex items-center mb-3 text-sm text-gray-500 dark:text-gray-400">
                        <MdGroup className="mr-2" />
                        <span>{project.teamName}</span>
                      </div>
                    )}

                    {/* Due Date */}
                    {project.dueDate && (
                      <div className="flex items-center mb-3 text-sm text-gray-500 dark:text-gray-400">
                        <MdSchedule className="mr-2" />
                        <span>Due: {formatDate(project.dueDate)}</span>
                      </div>
                    )}

                    {/* Task Progress */}
                    {project.taskCount > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Progress
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {project.completedTasks}/{project.taskCount} tasks
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(project.progress)}`}
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {project.progress}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Project Stats */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                      Created {formatDate(project.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <MdGroup size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No projects yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Create your first project to get started with team collaboration.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 flex items-center mx-auto transition-colors"
              >
                <MdAdd className="mr-2" />
                Create Your First Project
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Create New Project</h2>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Team *
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newProjectDueDate}
                  onChange={(e) => setNewProjectDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !newProjectName || !selectedTeamId}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  {createLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div><kbd className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Ctrl + N</kbd> Create new project</div>
              <div><kbd className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Ctrl + R</kbd> Refresh page</div>
              <div><kbd className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Esc</kbd> Close modal</div>
            </div>
            <button
              onClick={() => setShowShortcutsHelp(false)}
              className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ShareModal for project sharing */}
      {showShareModal && shareTarget && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setShareTarget(null);
          }}
          resourceType="project"
          resourceId={shareTarget.id}
          resourceName={shareTarget.name}
          onShareSuccess={() => {
            setShowShareModal(false);
            setShareTarget(null);
            console.log('✅ Project shared successfully');
          }}
        />
      )}
    </div>
  );
};

export default ProjectsPage; 