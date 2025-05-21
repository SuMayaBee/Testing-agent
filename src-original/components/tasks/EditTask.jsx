import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { tasksAPI, metricsAPI } from '../../lib/api';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

function EditTask() {
  const { taskId } = useParams();
  console.log('EditTask component initialized with task ID:', taskId);
  
  const navigate = useNavigate();
  const { currentOrganizationUsername } = useApp();
  const { currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    task_specific_metrics: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [taskLoading, setTaskLoading] = useState(true);

  // For task-specific metrics
  const [existingMetrics, setExistingMetrics] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsToRemove, setMetricsToRemove] = useState([]);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [newMetric, setNewMetric] = useState({
    name: '',
    description: '',
    evaluation_parameters: {}
  });
  const [newMetrics, setNewMetrics] = useState([]);
  const [paramKey, setParamKey] = useState('');
  const [paramValue, setParamValue] = useState('');
  
  // Ensure task ID is properly formatted
  useEffect(() => {
    if (taskId) {
      console.log('Raw task ID from URL:', taskId);
      // Check if the ID needs to be decoded
      if (taskId.includes('%')) {
        const decodedId = decodeURIComponent(taskId);
        console.log('Decoded task ID:', decodedId);
      }
    }
  }, [taskId]);
  
  // Fetch task details
  useEffect(() => {
    const fetchTask = async () => {
      try {
        console.log('EditTask component - useEffect running');
        console.log('Current task ID:', taskId);
        console.log('Current organization username:', currentOrganizationUsername);
        
        if (!currentOrganizationUsername) {
          console.log('No organization username available yet, aborting fetch');
          return;
        }

        try {
          setTaskLoading(true);
          console.log(`Attempting to fetch task with ID: ${taskId} for org: ${currentOrganizationUsername}`);
          
          const task = await tasksAPI.getTask(currentOrganizationUsername, taskId);
          console.log('Task fetch success:', task);
          
          setFormData({
            name: task.name,
            description: task.description,
            instructions: task.instructions,
            task_specific_metrics: task.task_specific_metrics || []
          });
          
          if (task.task_specific_metrics && task.task_specific_metrics.length > 0) {
            setMetricsLoading(true);
            try {
              const metricsData = await Promise.all(
                task.task_specific_metrics.map(metricId => 
                  metricsAPI.getMetric(currentOrganizationUsername, metricId)
                )
              );
              setExistingMetrics(metricsData);
            } catch (err) {
              console.error('Error fetching task metrics:', err);
            } finally {
              setMetricsLoading(false);
            }
          }
        } catch (err) {
          setError(err.message || 'Failed to fetch task');
          console.error('Error fetching task:', err);
        } finally {
          setTaskLoading(false);
        }
      } catch (outerError) {
        console.error('Unexpected error in fetchTask:', outerError);
        setError('An unexpected error occurred. Please try again.');
        setTaskLoading(false);
      }
    };

    fetchTask();
  }, [currentOrganizationUsername, taskId]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMetricChange = (e) => {
    const { name, value } = e.target;
    setNewMetric(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addParameter = () => {
    if (!paramKey.trim()) return;
    
    setNewMetric(prev => ({
      ...prev,
      evaluation_parameters: {
        ...prev.evaluation_parameters,
        [paramKey]: paramValue
      }
    }));
    
    setParamKey('');
    setParamValue('');
  };

  const removeParameter = (key) => {
    setNewMetric(prev => {
      const newParams = { ...prev.evaluation_parameters };
      delete newParams[key];
      return {
        ...prev,
        evaluation_parameters: newParams
      };
    });
  };

  const addNewMetric = () => {
    if (!newMetric.name || !newMetric.description) return;
    
    // Add a temporary ID for client-side handling
    const tempMetric = {
      ...newMetric,
      tempId: Date.now().toString()
    };
    
    setNewMetrics(prev => [...prev, tempMetric]);
    
    // Reset the form
    setNewMetric({
      name: '',
      description: '',
      evaluation_parameters: {}
    });
    
    setShowMetricForm(false);
  };

  const removeNewMetric = (tempId) => {
    setNewMetrics(prev => prev.filter(metric => metric.tempId !== tempId));
  };

  const toggleMetricRemoval = (metricId) => {
    setMetricsToRemove(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submit form triggered');

    if (!currentOrganizationUsername) {
      console.error('No organization username available');
      setError('Please select an organization first');
      return;
    }

    try {
      console.log('Starting task update process');
      console.log('Current organization:', currentOrganizationUsername);
      console.log('Task ID being updated:', taskId);
      
      setLoading(true);
      setError(null);
      
      // Create any new metrics
      const createdMetricIds = [];
      if (newMetrics.length > 0) {
        console.log('Creating new metrics:', newMetrics.length);
        const metricResponses = await Promise.all(
          newMetrics.map(async (metric) => {
            const metricData = {
              name: metric.name,
              description: metric.description,
              type: 'task-specific',
              evaluation_parameters: metric.evaluation_parameters
            };
            
            return metricsAPI.createMetric(
              currentOrganizationUsername,
              currentUser.email,
              metricData
            );
          })
        );
        
        // Extract IDs from created metrics
        metricResponses.forEach(metric => {
          createdMetricIds.push(metric.id);
        });
        console.log('Created new metric IDs:', createdMetricIds);
      }
      
      // Update the task metrics array - use existing formData.task_specific_metrics
      const currentMetricIds = formData.task_specific_metrics || [];
      console.log('Current metrics IDs:', currentMetricIds);
      console.log('Metrics to remove:', metricsToRemove);
      
      const updatedMetricIds = [
        ...currentMetricIds.filter(metricId => !metricsToRemove.includes(metricId)),
        ...createdMetricIds
      ];
      console.log('Updated metrics IDs array:', updatedMetricIds);
      
      // Update the task
      const updatedTaskData = {
        ...formData,
        task_specific_metrics: updatedMetricIds
      };
      console.log('Updating task with data:', updatedTaskData);
      
      await tasksAPI.updateTask(
        currentOrganizationUsername,
        taskId,
        updatedTaskData
      );
      
      navigate(`/tasks/${taskId}`);
    } catch (err) {
      setError(err.message || 'Failed to update task');
      console.error('Error updating task:', err);
    } finally {
      setLoading(false);
    }
  };

  if (taskLoading) {
    return <div className="container">Loading task details...</div>;
  }

  return (
    <div className="container">
      <h1>Edit Task</h1>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="name">Task Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="instructions">Instructions</label>
          <textarea
            id="instructions"
            name="instructions"
            value={formData.instructions}
            onChange={handleChange}
            required
            className="form-control"
            rows="6"
            placeholder="Enter detailed instructions for this task (e.g., 'Order a pizza with spicy toppings')"
          />
        </div>
        
        {/* Task-specific metrics section */}
        <div className="form-group">
          <div className="flex justify-between items-center mb-4">
            <label className="text-lg font-medium">Task-Specific Metrics</label>
            <button
              type="button"
              onClick={() => setShowMetricForm(true)}
              className="btn btn-sm btn-primary inline-flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add New Metric
            </button>
          </div>
          
          {/* Loading state for metrics */}
          {metricsLoading ? (
            <div className="text-center py-4">
              <div className="spinner"></div>
              <p className="mt-2 text-gray-600">Loading metrics...</p>
            </div>
          ) : (
            <>
              {/* Existing metrics */}
              {existingMetrics.length === 0 && newMetrics.length === 0 ? (
                <div className="bg-gray-50 border rounded-md p-4 text-center">
                  <p className="text-gray-500 mb-2">No task-specific metrics added yet</p>
                  <p className="text-sm text-gray-600">
                    Task-specific metrics help evaluate this particular task's performance
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {/* Display existing metrics */}
                  {existingMetrics.map(metric => (
                    <div 
                      key={metric.id} 
                      className={`bg-gray-50 border rounded-md p-3 ${
                        metricsToRemove.includes(metric.id) ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-primary-600">{metric.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                          
                          {Object.keys(metric.evaluation_parameters).length > 0 && (
                            <div className="mt-2">
                              <h4 className="text-xs font-medium text-gray-500">Parameters:</h4>
                              <div className="text-xs text-gray-600">
                                {Object.entries(metric.evaluation_parameters).map(([key, value]) => (
                                  <div key={key} className="mt-1">
                                    <span className="font-medium">{key}:</span> {value.toString()}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {metricsToRemove.includes(metric.id) && (
                            <div className="mt-2 text-xs text-red-600">
                              This metric will be removed upon saving
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleMetricRemoval(metric.id)}
                          className={`${
                            metricsToRemove.includes(metric.id) 
                              ? 'text-gray-500 hover:text-gray-700' 
                              : 'text-red-600 hover:text-red-800'
                          }`}
                        >
                          {metricsToRemove.includes(metric.id) ? (
                            <span className="text-xs">Undo</span>
                          ) : (
                            <TrashIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Display newly added metrics */}
                  {newMetrics.map(metric => (
                    <div key={metric.tempId} className="bg-gray-50 border rounded-md p-3 border-green-300">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-primary-600">{metric.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                          
                          {Object.keys(metric.evaluation_parameters).length > 0 && (
                            <div className="mt-2">
                              <h4 className="text-xs font-medium text-gray-500">Parameters:</h4>
                              <div className="text-xs text-gray-600">
                                {Object.entries(metric.evaluation_parameters).map(([key, value]) => (
                                  <div key={key} className="mt-1">
                                    <span className="font-medium">{key}:</span> {value.toString()}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-2 text-xs text-green-600">
                            New metric (will be added upon saving)
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewMetric(metric.tempId)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          
          {/* Inline form to add a new metric */}
          {showMetricForm && (
            <div className="bg-gray-50 border rounded-md p-4 mb-4">
              <h3 className="font-medium mb-2">Add Task-Specific Metric</h3>
              
              <div className="form-group">
                <label htmlFor="metricName" className="text-sm">Metric Name</label>
                <input
                  type="text"
                  id="metricName"
                  name="name"
                  value={newMetric.name}
                  onChange={handleMetricChange}
                  className="form-control"
                  placeholder="e.g., Order Completion Rate"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="metricDescription" className="text-sm">Description</label>
                <textarea
                  id="metricDescription"
                  name="description"
                  value={newMetric.description}
                  onChange={handleMetricChange}
                  className="form-control"
                  rows="2"
                  placeholder="Describe what this metric measures"
                />
              </div>
              
              <div className="form-group">
                <label className="text-sm">Evaluation Parameters</label>
                
                {Object.keys(newMetric.evaluation_parameters).length > 0 && (
                  <div className="mb-3 mt-1">
                    <div className="text-xs divide-y divide-gray-200 border rounded-md bg-white">
                      {Object.entries(newMetric.evaluation_parameters).map(([key, value]) => (
                        <div key={key} className="px-4 py-2 flex justify-between items-center">
                          <div>
                            <span className="font-medium">{key}:</span> {value.toString()}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeParameter(key)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2 mt-2">
                  <input
                    type="text"
                    placeholder="Parameter name"
                    value={paramKey}
                    onChange={(e) => setParamKey(e.target.value)}
                    className="form-control flex-1 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={paramValue}
                    onChange={(e) => setParamValue(e.target.value)}
                    className="form-control flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addParameter}
                    className="btn btn-sm btn-secondary"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowMetricForm(false)}
                  className="btn btn-sm btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addNewMetric}
                  className="btn btn-sm btn-primary"
                  disabled={!newMetric.name || !newMetric.description}
                >
                  Add Metric
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            onClick={() => navigate(`/tasks/${taskId}`)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditTask; 