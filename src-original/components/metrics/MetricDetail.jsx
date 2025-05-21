import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { metricsAPI, tasksAPI } from '../../lib/api';

function MetricDetail() {
  const [metric, setMetric] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [associatedTasks, setAssociatedTasks] = useState([]);
  
  const { currentOrganizationUsername } = useApp();
  const { metricId } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    async function fetchMetricAndTasks() {
      if (!currentOrganizationUsername || !metricId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the metric details
        const fetchedMetric = await metricsAPI.getMetric(currentOrganizationUsername, metricId);
        console.log('Metric data received:', fetchedMetric);
        console.log('Metric type:', fetchedMetric.type);
        
        // Set the metric
        setMetric(fetchedMetric);
        
        // If it's a task-specific metric, fetch the associated tasks
        if (fetchedMetric.type === 'task-specific') {
          console.log('This is a task-specific metric, fetching associated tasks');
          const allTasks = await tasksAPI.getTasks(currentOrganizationUsername);
          console.log('All tasks:', allTasks);
          
          // Find tasks that have this metric in their task_specific_metrics array
          const tasksWithThisMetric = allTasks.filter(task => {
            console.log(`Checking task ${task.id} - task_specific_metrics:`, task.task_specific_metrics);
            return task.task_specific_metrics && task.task_specific_metrics.includes(metricId);
          });
          
          console.log('Tasks with this metric:', tasksWithThisMetric);
          setAssociatedTasks(tasksWithThisMetric);
        } else {
          console.log('This is a generic metric, not fetching tasks');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch metric details');
        console.error('Error fetching metric:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMetricAndTasks();
  }, [currentOrganizationUsername, metricId]);

  const handleDeleteMetric = async () => {
    if (!confirm('Are you sure you want to delete this metric?')) return;
    
    try {
      await metricsAPI.deleteMetric(currentOrganizationUsername, metricId);
      navigate('/metrics');
    } catch (err) {
      setError(err.message || 'Failed to delete metric');
      console.error('Error deleting metric:', err);
    }
  };
  
  if (!currentOrganizationUsername) {
    return (
      <div className="container">
        <h1>Metric Details</h1>
        <p>Please select an organization to view metric details.</p>
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
        <Link to="/metrics" className="btn btn-secondary">Back to Metrics</Link>
      </div>
    </div>
  );
  
  if (!metric) return (
    <div className="container">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <p className="text-yellow-700">Metric not found</p>
      </div>
      <div className="mt-4">
        <Link to="/metrics" className="btn btn-secondary">Back to Metrics</Link>
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="header-with-actions">
        <h1>{metric.name}</h1>
        <div>
          <Link to={`/metrics/${metricId}/edit`} className="btn btn-secondary">Edit Metric</Link>
          <button onClick={handleDeleteMetric} className="btn btn-danger">Delete Metric</button>
        </div>
      </div>
      
      <div className="detail-card">
        <div className="flex items-center mb-4">
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 mr-2">
            {metric.type === 'generic' ? 'Generic' : 'Task-Specific'}
          </span>
        </div>
        
        <div className="detail-section">
          <h3>Description</h3>
          <p>{metric.description}</p>
        </div>
        
        {/* Associated Tasks - only shown for task-specific metrics */}
        {metric.type === 'task-specific' && (
          <div className="detail-section">
            <h3>Associated Tasks</h3>
            {associatedTasks.length === 0 ? (
              <div className="bg-yellow-50 border rounded-md p-4">
                <p className="text-yellow-700 italic mb-2">No tasks are currently using this metric</p>
                <p className="text-sm text-yellow-600">
                  Task-specific metrics should be associated with at least one task.
                  <Link
                    to={`/metrics/${metricId}/edit`}
                    className="ml-1 text-blue-600 hover:underline"
                  >
                    Edit this metric
                  </Link> to associate it with tasks.
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {associatedTasks.map(task => (
                  <div key={task.id} className="bg-gray-50 border rounded-md p-3">
                    <Link 
                      to={`/tasks/${task.id}`}
                      className="font-medium text-primary-600 hover:text-primary-800"
                    >
                      {task.name}
                    </Link>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {metric.evaluation_parameters && Object.keys(metric.evaluation_parameters).length > 0 && (
          <div className="detail-section">
            <h3>Evaluation Parameters</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Parameter</th>
                    <th className="px-4 py-2 text-left">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(metric.evaluation_parameters).map(([key, value]) => (
                    <tr key={key}>
                      <td className="border px-4 py-2">{key}</td>
                      <td className="border px-4 py-2">
                        {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="detail-section">
          <h3>Metadata</h3>
          <ul className="metadata-list">
            <li><strong>Created at:</strong> {new Date(metric.created_at).toLocaleString()}</li>
            <li><strong>Created by:</strong> {metric.created_by}</li>
            <li><strong>Organization:</strong> {currentOrganizationUsername}</li>
          </ul>
        </div>
      </div>
      
      <div className="back-button">
        <Link to="/metrics" className="btn">← Back to Metrics</Link>
      </div>
    </div>
  );
}

export default MetricDetail; 