import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { tasksAPI } from '../../lib/api';
import { 
  PlusIcon, 
  PencilSquareIcon as PencilAltIcon, 
  TrashIcon, 
  ArrowTopRightOnSquareIcon as ExternalLinkIcon,
  ClipboardDocumentIcon as ClipboardIcon
} from '@heroicons/react/24/outline';

function TasksList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentOrganizationUsername } = useApp();
  
  useEffect(() => {
    async function fetchTasks() {
      if (!currentOrganizationUsername) return;
      
      try {
        setLoading(true);
        setError(null);
        const fetchedTasks = await tasksAPI.getTasks(currentOrganizationUsername);
        setTasks(fetchedTasks);
      } catch (err) {
        setError(err.message || 'Failed to fetch tasks');
        console.error('Error fetching tasks:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTasks();
  }, [currentOrganizationUsername]);

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await tasksAPI.deleteTask(currentOrganizationUsername, taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (err) {
      setError(err.message || 'Failed to delete task');
      console.error('Error deleting task:', err);
    }
  };

  if (!currentOrganizationUsername) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Tasks</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">Please select an organization to view tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Link 
          to="/tasks/create" 
          className="btn btn-primary inline-flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-1" />
          Create Task
        </Link>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-12 text-center">
          <div className="bg-secondary-100 mx-auto rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <ClipboardIcon className="w-8 h-8 text-secondary-500" />
          </div>
          <h3 className="text-lg font-medium mb-2">No tasks found</h3>
          <p className="text-secondary-600 mb-6">Create your first task to get started with testing</p>
          <Link to="/tasks/create" className="btn btn-primary inline-flex items-center">
            <PlusIcon className="w-5 h-5 mr-1" />
            Create Task
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map(task => (
            <div key={task.id} className="bg-white rounded-lg border border-secondary-200 shadow-card overflow-hidden">
              <div className="p-5">
                <h3 className="text-lg font-semibold mb-2 text-secondary-900">{task.name}</h3>
                <p className="text-secondary-600 mb-4 line-clamp-2">{task.description}</p>
                <div className="text-xs text-secondary-500 mb-4">
                  Created {new Date(task.created_at).toLocaleDateString()}
                </div>
                <div className="flex space-x-2">
                  <Link 
                    to={`/tasks/${task.id}`} 
                    className="flex-1 btn btn-secondary btn-sm inline-flex items-center justify-center"
                  >
                    <ExternalLinkIcon className="w-4 h-4 mr-1" />
                    View
                  </Link>
                  <Link 
                    to={`/tasks/${task.id}/edit`} 
                    className="flex-1 btn btn-primary btn-sm inline-flex items-center justify-center"
                    onClick={() => {
                      console.log('TasksList - Edit button clicked for task with ID:', task.id);
                      console.log('TasksList - Full task object:', JSON.stringify(task));
                      // Check for any unusual characters in the ID
                      if (typeof task.id === 'string' && (task.id.includes('%') || task.id.includes('/') || task.id.includes(' '))) {
                        console.warn('TasksList - Task ID contains special characters that might need encoding:', task.id);
                      }
                    }}
                  >
                    <PencilAltIcon className="w-4 h-4 mr-1" />
                    Edit
                  </Link>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="btn btn-danger btn-sm inline-flex items-center justify-center"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TasksList; 