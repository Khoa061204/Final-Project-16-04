import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { 
  MdAdd, 
  MdEdit, 
  MdDelete, 
  MdClose, 
  MdCheck, 
  MdSchedule,
  MdPerson,
  MdFlag,
  MdMoreVert,
  MdCheckCircle
} from 'react-icons/md';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showEditProject, setShowEditProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Form states
  const [editProjectForm, setEditProjectForm] = useState({ name: '', description: '', dueDate: '' });
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    assignedUserId: '',
    priority: '',
    dueDate: '',
    userStory: '',
    storyPoints: ''
  });
  const [editTaskForm, setEditTaskForm] = useState({
    title: '',
    description: '',
    assignedUserId: '',
    status: '',
    priority: '',
    dueDate: '',
    userStory: '',
    storyPoints: ''
  });

  const [teamMembers, setTeamMembers] = useState([]);

  // Fetch project details
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch project');
        }

        const projectData = await response.json();
        setProject(projectData);
        setTasks(projectData.tasks || []);
        setEditProjectForm({
          name: projectData.name,
          description: projectData.description || '',
          dueDate: projectData.dueDate ? projectData.dueDate.split('T')[0] : ''
        });
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  // Fetch team members for assignment
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!project?.team?.id) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/teams/${project.team.id}/members`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error('Failed to fetch team members');
        const data = await response.json();
        setTeamMembers(data.members || []);
      } catch (err) {
        setTeamMembers([]);
      }
    };
    if (project?.team?.id) fetchTeamMembers();
  }, [project?.team?.id]);

  // Handle project update
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editProjectForm)
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      const updatedProject = await response.json();
      setProject(updatedProject);
      setShowEditProject(false);
    } catch (err) {
      console.error('Error updating project:', err);
      setError('Failed to update project');
    }
  };

  // Handle project deletion
  const handleDeleteProject = async () => {
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

      navigate('/projects');
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project');
    }
  };

  // Handle task creation
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTaskForm)
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const newTask = await response.json();
      setTasks([newTask, ...tasks]);
      setShowCreateTask(false);
      setNewTaskForm({
        title: '',
        description: '',
        assignedUserId: '',
        priority: '',
        dueDate: '',
        userStory: '',
        storyPoints: ''
      });
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task');
    }
  };

  // Handle task update
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editTaskForm)
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();
      setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
      setShowEditTask(false);
      setSelectedTask(null);
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task');
    }
  };

  // Open edit task modal
  const openEditTask = (task) => {
    setSelectedTask(task);
    setEditTaskForm({
      title: task.title,
      description: task.description || '',
      assignedUserId: task.assignedUserId || '',
      status: task.status,
      priority: task.priority || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      userStory: task.userStory || '',
      storyPoints: task.storyPoints || ''
    });
    setShowEditTask(true);
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Done': return 'text-green-600 bg-green-100';
      case 'In Progress': return 'text-blue-600 bg-blue-100';
      case 'To Do': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Claim a task
  const handleClaimTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/claim`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to claim task');
      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    } catch (err) {
      setError('Failed to claim task');
    }
  };

  // Complete a task
  const handleCompleteTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to complete task');
      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    } catch (err) {
      setError('Failed to complete task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => navigate('/projects')}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500 mb-4">Project not found</p>
        <button
          onClick={() => navigate('/projects')}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-12">
      {/* Project Header */}
      <div className="max-w-5xl mx-auto mt-8 mb-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-3xl text-blue-500 font-bold shadow">
              <MdFlag />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">{project.name}</h1>
              {project.description && <p className="text-gray-500 text-base mb-1 max-w-md line-clamp-2">{project.description}</p>}
              <div className="flex items-center text-sm text-gray-400 gap-2">
                <MdPerson />
                <span>Team: {project.team?.name}</span>
                {project.dueDate && <><span className="mx-2">•</span><MdSchedule /><span>Due: {new Date(project.dueDate).toLocaleDateString()}</span></>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <button onClick={() => setShowEditProject(true)} className="bg-blue-500 text-white px-5 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-1 shadow transition"><MdEdit />Edit</button>
            <button onClick={handleDeleteProject} className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 flex items-center gap-1 shadow transition"><MdDelete />Delete</button>
          </div>
        </div>
      </div>

      {/* Kanban Board Section */}
      <div className="max-w-7xl mx-auto px-2 md:px-6">
        <div className="relative">
          <div className="absolute right-0 -top-16 z-20">
            <button
              onClick={() => setShowCreateTask(true)}
              className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-green-600 flex items-center gap-2 text-lg font-semibold transition transform hover:scale-105"
            >
              <MdAdd className="text-2xl" /> Add Task
            </button>
          </div>
          <div className="w-full overflow-x-auto pb-4 rounded-xl bg-white/80 shadow-inner">
            <div className="min-w-[900px] flex gap-8 py-8">
              {/* To Do (Unassigned) */}
              <div className="flex-1 bg-gray-50 rounded-xl shadow-md flex flex-col max-h-[70vh] border border-gray-100">
                <div className="sticky top-0 z-10 bg-gray-100 rounded-t-xl p-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-700 tracking-wide">To Do</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {tasks.filter(t => t.status === 'To Do' && !t.assignedUserId).length === 0 ? (
                    <div className="text-center text-gray-300 italic py-12">No open tasks</div>
                  ) : (
                    tasks.filter(t => t.status === 'To Do' && !t.assignedUserId).map(task => (
                      <div key={task.id} className="bg-white rounded-xl shadow-lg p-5 flex flex-col gap-2 border border-gray-200 hover:shadow-2xl transition-shadow duration-200 group">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-base mb-1 group-hover:text-blue-600 transition">{task.title}</h4>
                            <p className="text-gray-500 text-sm mb-2 line-clamp-2">{task.description}</p>
                            <div className="flex flex-wrap gap-2 mb-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>{task.status}</span>
                              {task.priority && <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)} border-current`}><MdFlag className="inline mr-1" />{task.priority}</span>}
                              {task.dueDate && <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100 border border-blue-200"><MdSchedule className="inline mr-1" />{new Date(task.dueDate).toLocaleDateString()}</span>}
                              {task.userStory && <div className="text-xs text-gray-600 italic mb-1">{task.userStory}</div>}
                              {task.storyPoints && <span className="inline-block px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 mr-2" title="Story Points">{task.storyPoints} pts</span>}
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 items-end ml-2">
                            <button onClick={() => handleClaimTask(task.id)} className="bg-blue-500 text-white px-4 py-1.5 rounded-lg hover:bg-blue-600 text-xs font-semibold shadow transition">Claim</button>
                            <button onClick={() => openEditTask(task)} className="text-blue-500 hover:text-blue-700 p-1 transition"><MdEdit /></button>
                            <button onClick={() => handleDeleteTask(task.id)} className="text-red-500 hover:text-red-700 p-1 transition"><MdDelete /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* In Progress (Assigned) */}
              <div className="flex-1 bg-blue-50 rounded-xl shadow-md flex flex-col max-h-[70vh] border border-blue-100">
                <div className="sticky top-0 z-10 bg-blue-100 rounded-t-xl p-4 border-b border-blue-200">
                  <h3 className="text-lg font-bold text-blue-700 tracking-wide">In Progress</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {tasks.filter(t => t.status === 'In Progress').length === 0 ? (
                    <div className="text-center text-blue-200 italic py-12">No tasks in progress</div>
                  ) : (
                    tasks.filter(t => t.status === 'In Progress').map(task => (
                      <div key={task.id} className="bg-white rounded-xl shadow-lg p-5 flex flex-col gap-2 border border-blue-200 hover:shadow-2xl transition-shadow duration-200 group">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-base mb-1 group-hover:text-blue-700 transition">{task.title}</h4>
                            <p className="text-gray-500 text-sm mb-2 line-clamp-2">{task.description}</p>
                            <div className="flex flex-wrap gap-2 mb-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>{task.status}</span>
                              {task.priority && <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)} border-current`}><MdFlag className="inline mr-1" />{task.priority}</span>}
                              {task.dueDate && <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100 border border-blue-200"><MdSchedule className="inline mr-1" />{new Date(task.dueDate).toLocaleDateString()}</span>}
                              {task.userStory && <div className="text-xs text-gray-600 italic mb-1">{task.userStory}</div>}
                              {task.storyPoints && <span className="inline-block px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 mr-2" title="Story Points">{task.storyPoints} pts</span>}
                            </div>
                            {task.assignedUser && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-200 text-blue-700 font-bold text-base shadow">{task.assignedUser.username?.[0]?.toUpperCase() || task.assignedUser.name?.[0]?.toUpperCase() || '?'}</span>
                                <span>Assigned to: {task.assignedUser.username || task.assignedUser.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col space-y-2 items-end ml-2">
                            {user && task.assignedUserId === user.id && (
                              <button onClick={() => handleCompleteTask(task.id)} className="bg-green-500 text-white px-4 py-1.5 rounded-lg hover:bg-green-600 text-xs font-semibold shadow flex items-center transition"><MdCheckCircle className="mr-1" />Complete</button>
                            )}
                            <button onClick={() => openEditTask(task)} className="text-blue-500 hover:text-blue-700 p-1 transition"><MdEdit /></button>
                            <button onClick={() => handleDeleteTask(task.id)} className="text-red-500 hover:text-red-700 p-1 transition"><MdDelete /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* Done (Completed) */}
              <div className="flex-1 bg-green-50 rounded-xl shadow-md flex flex-col max-h-[70vh] border border-green-100">
                <div className="sticky top-0 z-10 bg-green-100 rounded-t-xl p-4 border-b border-green-200">
                  <h3 className="text-lg font-bold text-green-700 tracking-wide">Done</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {tasks.filter(t => t.status === 'Done').length === 0 ? (
                    <div className="text-center text-green-200 italic py-12">No completed tasks</div>
                  ) : (
                    tasks.filter(t => t.status === 'Done').map(task => (
                      <div key={task.id} className="bg-white rounded-xl shadow-lg p-5 flex flex-col gap-2 border border-green-200 hover:shadow-2xl transition-shadow duration-200 group">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-base mb-1 group-hover:text-green-700 transition">{task.title}</h4>
                            <p className="text-gray-500 text-sm mb-2 line-clamp-2">{task.description}</p>
                            <div className="flex flex-wrap gap-2 mb-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>{task.status}</span>
                              {task.priority && <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)} border-current`}><MdFlag className="inline mr-1" />{task.priority}</span>}
                              {task.dueDate && <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100 border border-blue-200"><MdSchedule className="inline mr-1" />{new Date(task.dueDate).toLocaleDateString()}</span>}
                              {task.userStory && <div className="text-xs text-gray-600 italic mb-1">{task.userStory}</div>}
                              {task.storyPoints && <span className="inline-block px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 mr-2" title="Story Points">{task.storyPoints} pts</span>}
                            </div>
                            {task.completedByUser && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-200 text-green-700 font-bold text-base shadow">{task.completedByUser.username?.[0]?.toUpperCase() || task.completedByUser.name?.[0]?.toUpperCase() || '?'}</span>
                                <span>Completed by: {task.completedByUser.username || task.completedByUser.name} {task.completedAt && `on ${new Date(task.completedAt).toLocaleDateString()}`}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col space-y-2 items-end ml-2">
                            <button onClick={() => openEditTask(task)} className="text-blue-500 hover:text-blue-700 p-1 transition"><MdEdit /></button>
                            <button onClick={() => handleDeleteTask(task.id)} className="text-red-500 hover:text-red-700 p-1 transition"><MdDelete /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Project Modal */}
      {showEditProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Project</h2>
            <form onSubmit={handleUpdateProject}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Project Name:</label>
                <input
                  type="text"
                  value={editProjectForm.name}
                  onChange={(e) => setEditProjectForm({...editProjectForm, name: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Description:</label>
                <textarea
                  value={editProjectForm.description}
                  onChange={(e) => setEditProjectForm({...editProjectForm, description: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="3"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Due Date:</label>
                <input
                  type="date"
                  value={editProjectForm.dueDate}
                  onChange={(e) => setEditProjectForm({...editProjectForm, dueDate: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditProject(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Title:</label>
                <input
                  type="text"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({...newTaskForm, title: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Description:</label>
                <textarea
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({...newTaskForm, description: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="3"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Priority:</label>
                <select
                  value={newTaskForm.priority}
                  onChange={(e) => setNewTaskForm({...newTaskForm, priority: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">Select Priority</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Due Date:</label>
                <input
                  type="date"
                  value={newTaskForm.dueDate}
                  onChange={(e) => setNewTaskForm({...newTaskForm, dueDate: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">User Story <span className="text-gray-400 text-xs" title="Format: As a [role], I want [feature], so that [benefit]">(Scrum)</span>:</label>
                <textarea
                  value={newTaskForm.userStory}
                  onChange={e => setNewTaskForm({ ...newTaskForm, userStory: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="2"
                  placeholder="As a user, I want ..."
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Story Points <span className="text-gray-400 text-xs" title="Scrum effort estimate (e.g. 1, 2, 3, 5, 8)">(Scrum)</span>:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newTaskForm.storyPoints}
                  onChange={e => setNewTaskForm({ ...newTaskForm, storyPoints: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="e.g. 3"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Assign to:</label>
                <select
                  value={newTaskForm.assignedUserId}
                  onChange={e => setNewTaskForm({ ...newTaskForm, assignedUserId: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">Unassigned (Task Pool)</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.username || member.name || member.email}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTask && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Task</h2>
            <form onSubmit={handleUpdateTask}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Title:</label>
                <input
                  type="text"
                  value={editTaskForm.title}
                  onChange={(e) => setEditTaskForm({...editTaskForm, title: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Description:</label>
                <textarea
                  value={editTaskForm.description}
                  onChange={(e) => setEditTaskForm({...editTaskForm, description: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="3"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Status:</label>
                <select
                  value={editTaskForm.status}
                  onChange={(e) => setEditTaskForm({...editTaskForm, status: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Priority:</label>
                <select
                  value={editTaskForm.priority}
                  onChange={(e) => setEditTaskForm({...editTaskForm, priority: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">Select Priority</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Due Date:</label>
                <input
                  type="date"
                  value={editTaskForm.dueDate}
                  onChange={(e) => setEditTaskForm({...editTaskForm, dueDate: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">User Story <span className="text-gray-400 text-xs" title="Format: As a [role], I want [feature], so that [benefit]">(Scrum)</span>:</label>
                <textarea
                  value={editTaskForm.userStory}
                  onChange={e => setEditTaskForm({ ...editTaskForm, userStory: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="2"
                  placeholder="As a user, I want ..."
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Story Points <span className="text-gray-400 text-xs" title="Scrum effort estimate (e.g. 1, 2, 3, 5, 8)">(Scrum)</span>:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editTaskForm.storyPoints}
                  onChange={e => setEditTaskForm({ ...editTaskForm, storyPoints: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="e.g. 3"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Assign to:</label>
                <select
                  value={editTaskForm.assignedUserId}
                  onChange={e => setEditTaskForm({ ...editTaskForm, assignedUserId: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">Unassigned (Task Pool)</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.username || member.name || member.email}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTask(false);
                    setSelectedTask(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage; 