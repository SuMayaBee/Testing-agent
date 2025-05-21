import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { tasksAPI, metricsAPI } from '../../lib/api';
import { PlusIcon } from '@heroicons/react/24/outline';

function TaskDetail() {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [taskSpecificMetrics, setTaskSpecificMetrics] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  
  const { currentOrganizationUsername } = useApp();
  const { taskId } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    async function fetchTaskAndMetrics() {
      console.log('TaskDetail - fetchTaskAndMetrics starting');
      console.log('TaskID:', taskId);
      console.log('Organization:', currentOrganizationUsername);
      
      if (!currentOrganizationUsername || !taskId) {
        console.log('Missing required data, aborting fetch');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        console.log(`TaskDetail - Attempting to fetch task: ${taskId} from org: ${currentOrganizationUsername}`);
        
        const fetchedTask = await tasksAPI.getTask(currentOrganizationUsername, taskId);
        console.log('Task data received:', fetchedTask);
        console.log('Task specific metrics array:', fetchedTask.task_specific_metrics);
        
        setTask(fetchedTask);
        
        // If task has specific metrics, fetch their details
        if (fetchedTask.task_specific_metrics && fetchedTask.task_specific_metrics.length > 0) {
          setMetricsLoading(true);
          try {
            const metricsData = await Promise.all(
              fetchedTask.task_specific_metrics.map(metricId => 
                metricsAPI.getMetric(currentOrganizationUsername, metricId)
              )
            );
            console.log('Metrics data received:', metricsData);
            setTaskSpecificMetrics(metricsData);
          } catch (metricErr) {
            console.error('Error fetching task-specific metrics:', metricErr);
          } finally {
            setMetricsLoading(false);
          }
        } else {
          console.log('No task-specific metrics found or array is empty');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch task details');
        console.error('Error fetching task:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTaskAndMetrics();
  }, [currentOrganizationUsername, taskId]);

  const handleDeleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await tasksAPI.deleteTask(currentOrganizationUsername, taskId);
      navigate('/tasks');
    } catch (err) {
      setError(err.message || 'Failed to delete task');
      console.error('Error deleting task:', err);
    }
  };
  
  if (!currentOrganizationUsername) {
    return (
      <div className="container">
        <h1>Task Details</h1>
        <p>Please select an organization to view task details.</p>
      </div>
    );
  }

  if (loading) return (
    <div className="container">
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="container">
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <p className="text-red-700">{error}</p>
      </div>
      <div className="mt-4">
        <Link to="/tasks" className="btn btn-secondary">Back to Tasks</Link>
      </div>
    </div>
  );
  
  if (!task) return (
    <div className="container">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <p className="text-yellow-700">Task not found</p>
      </div>
      <div className="mt-4">
        <Link to="/tasks" className="btn btn-secondary">Back to Tasks</Link>
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="header-with-actions">
        <h1>{task.name}</h1>
        <div>
          <Link 
            to={`/tasks/${taskId}/edit`} 
            className="btn btn-secondary"
            onClick={() => {
              console.log('TaskDetail - Edit button clicked for task ID:', taskId);
              console.log('TaskDetail - Full task object:', JSON.stringify(task));
            }}
          >
            Edit Task
          </Link>
          <button onClick={handleDeleteTask} className="btn btn-danger">Delete Task</button>
        </div>
      </div>
      
      <div className="detail-card">
        <div className="detail-section">
          <h3>Description</h3>
          <p>{task.description}</p>
        </div>
        
        <div className="detail-section">
          <h3>Instructions</h3>
          <div className="instructions-block">
            {task.instructions}
          </div>
        </div>
        
        {/* Task-Specific Metrics Section */}
        <div className="detail-section">
          <div className="flex justify-between items-center mb-4">
            <h3>Task-Specific Metrics</h3>
            <Link 
              to={`/metrics/create`}
              className="btn btn-sm btn-primary inline-flex items-center"
              state={{ taskId: taskId, initialType: 'task-specific' }}
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add Metric
            </Link>
          </div>
          
          {metricsLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : taskSpecificMetrics.length === 0 ? (
            <div className="bg-gray-50 border rounded-md p-4 text-center">
              <p className="text-gray-500 mb-2">No task-specific metrics are associated with this task</p>
              <p className="text-sm text-gray-600">
                Task-specific metrics help evaluate this particular task's performance
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {taskSpecificMetrics.map(metric => (
                <div key={metric.id} className="bg-gray-50 border rounded-md p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link
                        to={`/metrics/${metric.id}`}
                        className="font-medium text-primary-600 hover:text-primary-800"
                      >
                        {metric.name}
                      </Link>
                      <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                      {metric.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="detail-section">
          <h3>Metadata</h3>
          <ul className="metadata-list">
            <li><strong>Created at:</strong> {new Date(task.created_at).toLocaleString()}</li>
            <li><strong>Created by:</strong> {task.created_by}</li>
            <li><strong>Organization:</strong> {currentOrganizationUsername}</li>
          </ul>
        </div>
      </div>
      
      <div className="back-button">
        <Link to="/tasks" className="btn">← Back to Tasks</Link>
      </div>
    </div>
  );
}

export default TaskDetail; 