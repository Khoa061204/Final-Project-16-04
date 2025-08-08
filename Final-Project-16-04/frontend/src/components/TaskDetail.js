import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { 
  MdClose, 
  MdPerson, 
  MdFlag, 
  MdSchedule, 
  MdCheckCircle,
  MdAssignment
} from 'react-icons/md';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TaskDetail = ({ taskId, isOpen, onClose, onTaskUpdate }) => {
  const { user } = useContext(AuthContext);
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
    }
  }, [isOpen, taskId]);

  const fetchTaskDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Fetching task details:', {
        taskId,
        url: `${API_BASE_URL}/tasks/${taskId}`,
        hasToken: !!token
      });
      
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Task detail response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Task detail error response:', errorText);
        throw new Error(`Failed to fetch task details: ${response.status} ${response.statusText}`);
      }
      
      const taskData = await response.json();
      console.log('✅ Task data received:', taskData);
      setTask(taskData);
    } catch (err) {
      console.error('❌ Fetch task details error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimTask = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/claim`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to claim task');
      }
      
      const updatedTask = await response.json();
      setTask(updatedTask);
      if (onTaskUpdate) onTaskUpdate(updatedTask);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCompleteTask = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete task');
      }
      
      const updatedTask = await response.json();
      setTask(updatedTask);
      if (onTaskUpdate) onTaskUpdate(updatedTask);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'To Do': return 'text-gray-600 bg-gray-100';
      case 'In Progress': return 'text-blue-600 bg-blue-100';
      case 'Done': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <MdAssignment className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Task Details
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {task?.project?.name || 'Loading...'}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading task details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {task && (
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {task.title}
                </h3>
              </div>

              {/* Status and Priority */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                {task.priority && (
                  <div className="flex items-center space-x-2">
                    <MdFlag className="text-gray-400" size={16} />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority} Priority
                    </span>
                  </div>
                )}
              </div>

              {/* Assignment */}
              <div className="flex items-center space-x-2">
                <MdPerson className="text-gray-400" size={20} />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned to:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {task.assignedUser ? task.assignedUser.username : 'Unassigned'}
                </span>
              </div>

              {/* Due Date */}
              {task.dueDate && (
                <div className="flex items-center space-x-2">
                  <MdSchedule className="text-gray-400" size={20} />
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Due:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Description */}
              {task.description && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Description
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {!task.assignedUserId && task.status !== 'Done' && (
                  <button
                    onClick={handleClaimTask}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <MdPerson size={16} />
                    Claim Task
                  </button>
                )}
                
                {task.assignedUserId === user?.id && task.status !== 'Done' && (
                  <button
                    onClick={handleCompleteTask}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <MdCheckCircle size={16} />
                    Mark Complete
                  </button>
                )}

                {task.status === 'Done' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <MdCheckCircle size={16} />
                    <span className="font-medium">Task Completed</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;