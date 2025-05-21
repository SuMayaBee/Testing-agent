import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { metricsAPI, tasksAPI } from '../../lib/api';

function EditMetric() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'generic',
    evaluation_parameters: {},
    associated_tasks: []
  });
  const [paramKey, setParamKey] = useState('');
  const [paramValue, setParamValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [associatedTasksData, setAssociatedTasksData] = useState([]);
  
  const { currentOrganizationUsername } = useApp();
  const { metricId } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (currentOrganizationUsername && metricId) {
      fetchMetricAndTasks();
    }
  }, [currentOrganizationUsername, metricId]);

  const fetchMetricAndTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fetchedMetric = await metricsAPI.getMetric(currentOrganizationUsername, metricId);
      
      const allTasks = await tasksAPI.getTasks(currentOrganizationUsername);
      setAvailableTasks(allTasks);
      
      const associatedTasks = allTasks.filter(task => 
        task.task_specific_metrics && task.task_specific_metrics.includes(metricId)
      );
      
      setAssociatedTasksData(associatedTasks);
      
      setFormData({
        name: fetchedMetric.name,
        description: fetchedMetric.description,
        type: fetchedMetric.type,
        evaluation_parameters: fetchedMetric.evaluation_parameters || {},
        associated_tasks: associatedTasks.map(task => task.id)
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch metric details');
      console.error('Error fetching metric:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTaskSelection = (taskId) => {
    setFormData(prev => {
      if (prev.associated_tasks.includes(taskId)) {
        return {
          ...prev,
          associated_tasks: prev.associated_tasks.filter(id => id !== taskId)
        };
      } else {
        return {
          ...prev,
          associated_tasks: [...prev.associated_tasks, taskId]
        };
      }
    });
  };

  const addParameter = () => {
    if (!paramKey.trim()) return;
    
    setFormData(prev => ({
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
    setFormData(prev => {
      const newParams = { ...prev.evaluation_parameters };
      delete newParams[key];
      return {
        ...prev,
        evaluation_parameters: newParams
      };
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentOrganizationUsername) {
      setError('Please select an organization first');
      return;
    }

    if (formData.type === 'task-specific' && formData.associated_tasks.length === 0) {
      setError('Task-specific metrics must be associated with at least one task');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const metricData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        evaluation_parameters: formData.evaluation_parameters
      };
      
      await metricsAPI.updateMetric(
        currentOrganizationUsername,
        metricId,
        metricData
      );
      
      const tasksToAdd = formData.associated_tasks.filter(
        taskId => !associatedTasksData.find(task => task.id === taskId)
      );
      
      const tasksToRemove = associatedTasksData
        .filter(task => !formData.associated_tasks.includes(task.id))
        .map(task => task.id);
      
      for (const taskId of tasksToAdd) {
        const taskData = await tasksAPI.getTask(currentOrganizationUsername, taskId);
        const updatedTaskData = {
          ...taskData,
          task_specific_metrics: [
            ...(taskData.task_specific_metrics || []),
            metricId
          ]
        };
        await tasksAPI.updateTask(currentOrganizationUsername, taskId, updatedTaskData);
      }
      
      for (const taskId of tasksToRemove) {
        const taskData = await tasksAPI.getTask(currentOrganizationUsername, taskId);
        const updatedTaskData = {
          ...taskData,
          task_specific_metrics: (taskData.task_specific_metrics || []).filter(id => id !== metricId)
        };
        await tasksAPI.updateTask(currentOrganizationUsername, taskId, updatedTaskData);
      }
      
      navigate(`/metrics/${metricId}`);
    } catch (err) {
      setError(err.message || 'Failed to update metric');
      console.error('Error updating metric:', err);
    } finally {
      setSaving(false);
    }
  };
  
  if (!currentOrganizationUsername) {
    return (
      <div className="container">
        <h1>Edit Metric</h1>
        <p>Please select an organization to edit metrics.</p>
      </div>
    );
  }

  if (loading) return <div className="container"><p>Loading metric details...</p></div>;
  
  return (
    <div className="container">
      <h1>Edit Metric</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="name">Metric Name</label>
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
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            className="form-control"
            rows="3"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="type">Metric Type</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="form-control"
          >
            <option value="generic">Generic</option>
            <option value="task-specific">Task-Specific</option>
          </select>
          {formData.type === 'generic' && (
            <p className="text-xs text-gray-500 mt-1">
              Generic metrics can be applied to any test
            </p>
          )}
          {formData.type === 'task-specific' && (
            <p className="text-xs text-gray-500 mt-1">
              Task-specific metrics are designed for specific testing scenarios
            </p>
          )}
        </div>
        
        {formData.type === 'task-specific' && (
          <div className="form-group">
            <label>Associated Tasks</label>
            <p className="text-xs text-gray-500 mb-2">
              Select the tasks this metric is designed to evaluate
            </p>
            
            {tasksLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : availableTasks.length === 0 ? (
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm">
                No tasks available. <a href="/tasks/create" className="text-blue-600 hover:underline">Create a task</a> first.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                {availableTasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`p-3 flex items-start ${formData.associated_tasks.includes(task.id) ? 'bg-blue-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      id={`task-${task.id}`}
                      checked={formData.associated_tasks.includes(task.id)}
                      onChange={() => handleTaskSelection(task.id)}
                      className="mt-1 mr-3"
                    />
                    <label htmlFor={`task-${task.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium">{task.name}</div>
                      <div className="text-sm text-gray-600 line-clamp-2">{task.description}</div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="form-group">
          <label>Evaluation Parameters</label>
          
          {Object.keys(formData.evaluation_parameters).length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Current Parameters</h4>
              <ul className="divide-y divide-gray-200 border rounded-md">
                {Object.entries(formData.evaluation_parameters).map(([key, value]) => (
                  <li key={key} className="px-4 py-3 flex justify-between items-center">
                    <div>
                      <span className="font-medium">{key}:</span> {value.toString()}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParameter(key)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Parameter name"
              value={paramKey}
              onChange={(e) => setParamKey(e.target.value)}
              className="form-control flex-1"
            />
            <input
              type="text"
              placeholder="Value"
              value={paramValue}
              onChange={(e) => setParamValue(e.target.value)}
              className="form-control flex-1"
            />
            <button
              type="button"
              onClick={addParameter}
              className="btn btn-secondary"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Add parameters that will be used to configure this metric's evaluation
          </p>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            onClick={() => navigate(`/metrics/${metricId}`)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditMetric; 