import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App'; // Assuming AuthContext is defined in App.js for authentication
import { 
  MdAdd, 
  MdEdit, 
  MdDelete, 
  MdVisibility, 
  MdGroup,
  MdCalendarToday,
  MdFlag
} from 'react-icons/md';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext); // Use AuthContext to get user or token
  const [showCreateModal, setShowCreateModal] = useState(false); // State to control modal visibility
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectDueDate, setNewProjectDueDate] = useState(''); // State for due date
  const [selectedTeamId, setSelectedTeamId] = useState(''); // State to hold selected team
  const [teams, setTeams] = useState([]); // State to hold the list of teams
  const navigate = useNavigate();

  // Fetch teams for the dropdown
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/teams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          console.error('Failed to fetch teams', response.statusText);
          // Handle error fetching teams
          return;
        }
        const data = await response.json();
        setTeams(data.teams || []); // Assuming teams endpoint returns { teams: [...] }
      } catch (err) {
        console.error('Error fetching teams:', err);
        // Handle error fetching teams
      }
    };

    if (user) {
      fetchTeams();
    }
  }, [user]);


  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token'); // Assuming token is stored in localStorage
        const response = await fetch(`${API_BASE_URL}/projects`, { // Placeholder API endpoint
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          // Handle different HTTP status codes
          if (response.status === 401) {
             setError('Unauthorized. Please log in.');
          } else {
             throw new Error(`Error fetching projects: ${response.statusText}`);
          }
          return; // Stop execution if there's an error
        }

        const data = await response.json();
        setProjects(data); // Assuming the API returns an array of projects directly

      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch projects if the user is authenticated (optional, but good practice)
    if (user) {
       fetchProjects();
    } else {
       // Handle case where user is not logged in, maybe redirect or show a message
       setLoading(false);
       setError('Please log in to view your projects.');
    }

  }, [user]); // Dependency on user to refetch if user changes

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName || !selectedTeamId) {
      setError('Project name and team are required.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          teamId: selectedTeamId,
          dueDate: newProjectDueDate,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }

      const createdProject = await response.json();
      setProjects([createdProject, ...projects]); // Add the new project to the list
      setShowCreateModal(false); // Close the modal
      setNewProjectName(''); // Clear form fields
      setNewProjectDescription('');
      setSelectedTeamId('');
      setNewProjectDueDate('');
      setError(null); // Clear any previous errors

    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.message || 'Failed to create project. Please try again.');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      setProjects(projects.filter(project => project.id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project');
    }
  };

  const getTaskStats = (tasks) => {
    if (!tasks || tasks.length === 0) return { total: 0, completed: 0, inProgress: 0, todo: 0 };
    
    return {
      total: tasks.length,
      completed: tasks.filter(task => task.status === 'Done').length,
      inProgress: tasks.filter(task => task.status === 'In Progress').length,
      todo: tasks.filter(task => task.status === 'To Do').length
    };
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 flex items-center shadow-md"
        >
          <MdAdd className="mr-2" />
          Create New Project
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="loading-spinner mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading projects...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-6">Create your first project to get started with team collaboration</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            Create Your First Project
          </button>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const taskStats = getTaskStats(project.tasks);
            return (
              <div key={project.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 line-clamp-2">{project.name}</h2>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          if (typeof project.id === 'number' || /^[a-zA-Z0-9-]+$/.test(project.id)) {
                            navigate(`/projects/${project.id}`);
                          } else {
                            alert('Invalid project ID: ' + project.id);
                          }
                        }}
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="View Project"
                      >
                        <MdVisibility />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete Project"
                      >
                        <MdDelete />
                      </button>
                    </div>
                  </div>
                  
                  {project.description && (
                    <p className="text-gray-600 mb-4 line-clamp-3">{project.description}</p>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <MdGroup className="mr-1" />
                    <span>{project.team?.name}</span>
                  </div>

                  {/* Task Statistics */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Tasks</span>
                      <span>{taskStats.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      {taskStats.total > 0 && (
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(taskStats.completed / taskStats.total) * 100}%` }}
                        ></div>
                      )}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{taskStats.completed} done</span>
                      <span>{taskStats.inProgress} in progress</span>
                      <span>{taskStats.todo} to do</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <div className="flex items-center">
                      <MdCalendarToday className="mr-1" />
                      <span>
                        {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (typeof project.id === 'number' || /^[a-zA-Z0-9-]+$/.test(project.id)) {
                          navigate(`/projects/${project.id}`);
                        } else {
                          alert('Invalid project ID: ' + project.id);
                        }
                      }}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create New Project</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <MdDelete />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label htmlFor="projectName" className="block text-gray-700 text-sm font-bold mb-2">
                  Project Name:
                </label>
                <input
                  type="text"
                  id="projectName"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="projectDescription" className="block text-gray-700 text-sm font-bold mb-2">
                  Description (Optional):
                </label>
                <textarea
                  id="projectDescription"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="3"
                ></textarea>
              </div>
              <div className="mb-4">
                <label htmlFor="projectDueDate" className="block text-gray-700 text-sm font-bold mb-2">
                  Due Date (Optional):
                </label>
                <input
                  type="date"
                  id="projectDueDate"
                  value={newProjectDueDate}
                  onChange={(e) => setNewProjectDueDate(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="projectTeam" className="block text-gray-700 text-sm font-bold mb-2">
                  Team:
                </label>
                <select
                  id="projectTeam"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="">Select a Team</option>
                  {teams.map(team => (
                    <option key={team.id || team._id} value={team.id || team._id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Create Project
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
    </div>
  );
};

export default ProjectsPage; 