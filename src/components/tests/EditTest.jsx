import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { testsAPI, tasksAPI, metricsAPI } from '../../lib/api';

function EditTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { currentOrganizationUsername } = useApp();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: '',
    target_phone_numbers: [''],
    tasks: [],
    metrics: []
  });
  
  const [availableTasks, setAvailableTasks] = useState([]);
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [taskSpecificMetricsMap, setTaskSpecificMetricsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch test data and available tasks/metrics
  useEffect(() => {
    async function fetchData() {
      if (!currentOrganizationUsername || !testId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const [testData, tasks, metrics] = await Promise.all([
          testsAPI.getTest(currentOrganizationUsername, testId),
          tasksAPI.getTasks(currentOrganizationUsername),
          metricsAPI.getMetrics(currentOrganizationUsername)
        ]);
        
        setAvailableTasks(tasks);
        setAvailableMetrics(metrics);
        
        // Create a map of task-specific metrics for each task
        const taskMetricsMap = {};
        
        // For each task, fetch its task-specific metrics
        await Promise.all(
          tasks.map(async (task) => {
            try {
              const taskSpecificMetrics = await metricsAPI.getTaskSpecificMetrics(
                currentOrganizationUsername, 
                task.id
              );
              
              if (taskSpecificMetrics && taskSpecificMetrics.length > 0) {
                taskMetricsMap[task.id] = taskSpecificMetrics.map(metric => metric.id);
              } else {
                taskMetricsMap[task.id] = [];
              }
            } catch (err) {
              console.error(`Error fetching task-specific metrics for task ${task.id}:`, err);
              taskMetricsMap[task.id] = [];
            }
          })
        );
        
        setTaskSpecificMetricsMap(taskMetricsMap);
        
        // Get all generic metrics
        const genericMetricIds = metrics
          .filter(metric => metric.type !== 'task-specific')
          .map(metric => metric.id);
        
        // Start with the existing selected metrics from the test
        let selectedMetrics = testData.metrics || [];
        
        // Make sure all generic metrics are included
        genericMetricIds.forEach(metricId => {
          if (!selectedMetrics.includes(metricId)) {
            selectedMetrics.push(metricId);
          }
        });
        
        // Set form data with the adjusted metrics
        setFormData({
          name: testData.name,
          description: testData.description || '',
          system_prompt: testData.system_prompt,
          target_phone_numbers: testData.target_phone_numbers.length > 0 
            ? testData.target_phone_numbers 
            : [''],
          tasks: testData.tasks || [],
          metrics: selectedMetrics
        });
      } catch (err) {
        console.error('Error fetching test data:', err);
        setError(err.message || 'Failed to load test data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [currentOrganizationUsername, testId]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePhoneNumberChange = (index, value) => {
    const updatedPhoneNumbers = [...formData.target_phone_numbers];
    updatedPhoneNumbers[index] = value;
    setFormData((prev) => ({
      ...prev,
      target_phone_numbers: updatedPhoneNumbers
    }));
  };
  
  const addPhoneNumber = () => {
    setFormData((prev) => ({
      ...prev,
      target_phone_numbers: [...prev.target_phone_numbers, '']
    }));
  };
  
  const removePhoneNumber = (index) => {
    const updatedPhoneNumbers = [...formData.target_phone_numbers];
    updatedPhoneNumbers.splice(index, 1);
    setFormData((prev) => ({
      ...prev,
      target_phone_numbers: updatedPhoneNumbers
    }));
  };
  
  const handleTaskSelection = (e) => {
    const taskId = e.target.value;
    const isChecked = e.target.checked;
    
    setFormData(prev => {
      let updatedTasks, updatedMetrics;
      
      if (isChecked) {
        // Add task to selected tasks
        updatedTasks = [...prev.tasks, taskId];
        
        // Add task-specific metrics for this task
        const taskSpecificMetrics = taskSpecificMetricsMap[taskId] || [];
        updatedMetrics = [...prev.metrics, ...taskSpecificMetrics];
      } else {
        // Remove task from selected tasks
        updatedTasks = prev.tasks.filter(id => id !== taskId);
        
        // Remove task-specific metrics for this task, keeping all other metrics
        const taskSpecificMetrics = taskSpecificMetricsMap[taskId] || [];
        updatedMetrics = prev.metrics.filter(metricId => !taskSpecificMetrics.includes(metricId));
      }
      
      return {
        ...prev,
        tasks: updatedTasks,
        metrics: updatedMetrics
      };
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentOrganizationUsername) {
      setError('Please select an organization first');
      return;
    }
    
    // Validate form data
    if (!formData.name.trim()) {
      setError('Test name is required');
      return;
    }
    
    if (!formData.system_prompt.trim()) {
      setError('System prompt is required');
      return;
    }
    
    // Filter out empty phone numbers
    const phoneNumbers = formData.target_phone_numbers.filter(num => num.trim());
    if (phoneNumbers.length === 0) {
      setError('At least one target phone number is required');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Clean up formData for submission
      const testData = {
        ...formData,
        target_phone_numbers: phoneNumbers,
      };
      
      console.log('Updating test with data:', testData);
      
      const updatedTest = await testsAPI.updateTest(
        currentOrganizationUsername,
        testId,
        testData
      );
      
      console.log('Test updated:', updatedTest);
      
      // Navigate to the test detail page
      navigate(`/tests/${testId}`);
    } catch (err) {
      console.error('Error updating test:', err);
      setError(err.message || 'Failed to update test. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Get selected metrics for display
  const getSelectedMetrics = () => {
    return availableMetrics.filter(metric => formData.metrics.includes(metric.id));
  };
  
  if (!currentOrganizationUsername) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Edit Test</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">Please select an organization to edit this test.</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Edit Test</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Test</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-secondary-200 shadow-card p-6">
        <div className="mb-6">
          <label htmlFor="name" className="block mb-1 font-medium">
            Test Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter test name"
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="description" className="block mb-1 font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Describe the purpose of this test"
            rows="3"
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="system_prompt" className="block mb-1 font-medium">
            System Prompt
          </label>
          <textarea
            id="system_prompt"
            name="system_prompt"
            value={formData.system_prompt}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="The system prompt that will guide the testing agent's behavior"
            rows="5"
            required
          />
          <div className="mt-1 text-sm text-secondary-600">
            This is the prompt that guides how the testing agent will behave when calling the phone agent.
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block mb-1 font-medium">
            Target Phone Numbers
          </label>
          <div className="space-y-3">
            {formData.target_phone_numbers.map((number, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="tel"
                  value={number}
                  onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter phone number"
                />
                {formData.target_phone_numbers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhoneNumber(index)}
                    className="btn btn-danger btn-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPhoneNumber}
              className="btn btn-secondary btn-sm"
            >
              Add Another Phone Number
            </button>
          </div>
          <div className="mt-1 text-sm text-secondary-600">
            Add multiple phone numbers to compare different versions of your phone agent.
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-medium mb-3">Select Tasks</h3>
            {availableTasks.length === 0 ? (
              <div className="text-secondary-600">No tasks available. Create tasks first.</div>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-secondary-300 rounded-md p-3">
                {availableTasks.map(task => (
                  <div key={task.id} className="mb-2">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        value={task.id}
                        checked={formData.tasks.includes(task.id)}
                        onChange={handleTaskSelection}
                        className="mt-1"
                      />
                      <div className="ml-2">
                        <div className="font-medium">{task.name}</div>
                        <div className="text-sm text-secondary-600 line-clamp-2">
                          {task.description}
                        </div>
                        {taskSpecificMetricsMap[task.id]?.length > 0 && (
                          <div className="text-xs text-primary-700 mt-1">
                            Has {taskSpecificMetricsMap[task.id].length} task-specific {taskSpecificMetricsMap[task.id].length === 1 ? 'metric' : 'metrics'}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Selected Metrics</h3>
            {getSelectedMetrics().length === 0 ? (
              <div className="text-secondary-600">No metrics selected yet.</div>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-secondary-300 rounded-md p-3">
                {getSelectedMetrics().map(metric => (
                  <div key={metric.id} className="mb-2 flex items-start">
                    <div className="ml-2">
                      <div className="font-medium">{metric.name}</div>
                      <div className="text-sm text-secondary-600 line-clamp-2">
                        {metric.description}
                      </div>
                      <div className={`text-xs rounded px-2 py-0.5 inline-block mt-1 ${
                        metric.type === 'task-specific' 
                          ? 'bg-primary-100 text-primary-800' 
                          : 'bg-secondary-100 text-secondary-800'
                      }`}>
                        {metric.type === 'task-specific' ? 'Task-specific' : 'Generic'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 text-sm text-secondary-600">
              Generic metrics are automatically included. Task-specific metrics are included when you select their associated tasks.
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate(`/tests/${testId}`)}
            className="btn btn-secondary"
            disabled={saving}
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

export default EditTest; 