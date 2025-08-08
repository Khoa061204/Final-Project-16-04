import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import { MdFlag, MdSchedule } from 'react-icons/md';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const MyTasksPage = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const projects = await response.json();
      // Flatten all tasks assigned to current user
      const myTasks = [];
      projects.forEach(project => {
        (project.tasks || []).forEach(task => {
          if (task.assignedUserId === user.id) {
            myTasks.push({ ...task, project });
          }
        });
      });
      setTasks(myTasks);
      setLoading(false);
    };
    if (user) fetchTasks();
  }, [user]);

  const grouped = {
    'To Do': tasks.filter(t => !t.assignedUserId),
    'In Progress': tasks.filter(t => t.assignedUserId && t.status !== 'Done'),
    'Done': tasks.filter(t => t.status === 'Done'),
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 bg-white dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">My Tasks</h1>
      {loading ? (
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      ) : (
        <div className="flex gap-8">
          {['To Do', 'In Progress', 'Done'].map(status => (
            <div key={status} className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-xl shadow-md flex flex-col max-h-[70vh] border border-gray-100 dark:border-gray-600">
              <div className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-600 rounded-t-xl p-4 border-b border-gray-200 dark:border-gray-500">
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 tracking-wide">{status}</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {grouped[status].length === 0 ? (
                  <div className="text-center text-gray-300 dark:text-gray-400 italic py-12">No tasks</div>
                ) : grouped[status].map(task => (
                  <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 flex flex-col gap-2 border border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-base mb-1">{task.title}</h4>
                        <p className="text-gray-500 dark:text-gray-300 text-sm mb-2 line-clamp-2">{task.description}</p>
                        <div className="flex flex-wrap gap-2 mb-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700`}>{task.status}</span>
                          {task.priority && <span className={`px-2 py-1 rounded-full text-xs font-medium border border-blue-400 text-blue-700`}><MdFlag className="inline mr-1" />{task.priority}</span>}
                          {task.dueDate && <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100 border border-blue-200"><MdSchedule className="inline mr-1" />{new Date(task.dueDate).toLocaleDateString()}</span>}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-300">Project: {task.project?.name}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTasksPage; 