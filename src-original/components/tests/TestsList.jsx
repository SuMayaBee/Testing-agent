import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { testsAPI, voiceAgentAPI } from '../../lib/api';
import { 
  PlusIcon, 
  PencilSquareIcon as PencilAltIcon, 
  TrashIcon, 
  ArrowTopRightOnSquareIcon as ExternalLinkIcon,
  ClipboardDocumentIcon as ClipboardIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

function TestsList() {
  const [tests, setTests] = useState([]);
  const [selectedTests, setSelectedTests] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentOrganizationUsername } = useApp();
  
  useEffect(() => {
    async function fetchTests() {
      if (!currentOrganizationUsername) return;
      
      try {
        setLoading(true);
        setError(null);
        const fetchedTests = await testsAPI.getTests(currentOrganizationUsername);
        setTests(fetchedTests);
        
        // Initialize selected state
        const initialSelected = {};
        fetchedTests.forEach(test => {
          initialSelected[test.id] = false;
        });
        setSelectedTests(initialSelected);
      } catch (err) {
        setError(err.message || 'Failed to fetch tests');
        console.error('Error fetching tests:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTests();
  }, [currentOrganizationUsername]);

  const handleDeleteTest = async (testId) => {
    if (!confirm('Are you sure you want to delete this test?')) return;
    
    try {
      await testsAPI.deleteTest(currentOrganizationUsername, testId);
      setTests(tests.filter(test => test.id !== testId));
    } catch (err) {
      setError(err.message || 'Failed to delete test');
      console.error('Error deleting test:', err);
    }
  };
  
  const toggleTestSelection = (testId) => {
    setSelectedTests(prev => ({
      ...prev,
      [testId]: !prev[testId]
    }));
  };
  
  const selectAllTests = () => {
    const newSelected = {};
    tests.forEach(test => {
      newSelected[test.id] = true;
    });
    setSelectedTests(newSelected);
  };
  
  const deselectAllTests = () => {
    const newSelected = {};
    tests.forEach(test => {
      newSelected[test.id] = false;
    });
    setSelectedTests(newSelected);
  };
  
  const getSelectedTestIds = () => {
    return Object.keys(selectedTests).filter(id => selectedTests[id]);
  };
  
  const handleRunSelectedTests = async () => {
    const selectedIds = getSelectedTestIds();
    if (selectedIds.length === 0) {
      alert('Please select at least one test to run');
      return;
    }
    
    if (!confirm(`Are you sure you want to run ${selectedIds.length} selected tests?`)) return;
    
    // Prepare phone number mappings
    const phoneNumbers = {};
    selectedIds.forEach(testId => {
      const test = tests.find(t => t.id === testId);
      if (test && test.target_phone_numbers && test.target_phone_numbers.length > 0) {
        phoneNumbers[testId] = test.target_phone_numbers[0];
      }
    });
    
    // Check if any test doesn't have a phone number
    const testsWithoutPhones = selectedIds.filter(id => !phoneNumbers[id]);
    if (testsWithoutPhones.length > 0) {
      alert(`Warning: ${testsWithoutPhones.length} selected tests don't have phone numbers and will be skipped.`);
    }
    
    try {
      // Use the batch API
      const result = await voiceAgentAPI.runBatchTests(
        currentOrganizationUsername,
        selectedIds,
        phoneNumbers
      );
      
      // Show success message
      alert(`Tests have been queued for execution. Results will be available in the Simulations page within a few minutes.`);
      
    } catch (err) {
      setError(err.message || 'Failed to run selected tests');
      console.error('Error running tests:', err);
    }
  };
  
  const handleRunAllTests = async () => {
    if (tests.length === 0) {
      alert('There are no tests to run');
      return;
    }
    
    if (!confirm(`Are you sure you want to run all ${tests.length} tests?`)) return;
    
    // Prepare test IDs and phone number mappings
    const testIds = tests.map(test => test.id);
    const phoneNumbers = {};
    
    tests.forEach(test => {
      if (test.target_phone_numbers && test.target_phone_numbers.length > 0) {
        phoneNumbers[test.id] = test.target_phone_numbers[0];
      }
    });
    
    // Check if any test doesn't have a phone number
    const testsWithoutPhones = testIds.filter(id => !phoneNumbers[id]);
    if (testsWithoutPhones.length > 0) {
      alert(`Warning: ${testsWithoutPhones.length} tests don't have phone numbers and will be skipped.`);
    }
    
    try {
      // Use the batch API
      const result = await voiceAgentAPI.runBatchTests(
        currentOrganizationUsername,
        testIds,
        phoneNumbers
      );
      
      // Show success message
      alert(`Tests have been queued for execution. Results will be available in the Simulations page within a few minutes.`);
      
    } catch (err) {
      setError(err.message || 'Failed to run all tests');
      console.error('Error running tests:', err);
    }
  };

  if (!currentOrganizationUsername) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Tests</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">Please select an organization to view tests.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tests</h1>
        <div className="flex space-x-2">
          {getSelectedTestIds().length > 0 && (
            <button 
              onClick={handleRunSelectedTests}
              className="btn btn-success inline-flex items-center"
            >
              <PlayIcon className="w-5 h-5 mr-1" />
              Run Selected ({getSelectedTestIds().length})
            </button>
          )}
          
          {tests.length > 0 && (
            <button 
              onClick={handleRunAllTests}
              className="btn btn-success inline-flex items-center"
            >
              <PlayIcon className="w-5 h-5 mr-1" />
              Run All
            </button>
          )}
          
          <Link 
            to="/tests/create" 
            className="btn btn-primary inline-flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-1" />
            Create Test
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {tests.length > 0 && (
        <div className="mb-4 flex justify-end space-x-2">
          <button 
            onClick={selectAllTests}
            className="btn btn-secondary btn-sm"
          >
            Select All
          </button>
          <button 
            onClick={deselectAllTests}
            className="btn btn-secondary btn-sm"
          >
            Deselect All
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-12 text-center">
          <div className="bg-secondary-100 mx-auto rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <ClipboardIcon className="w-8 h-8 text-secondary-500" />
          </div>
          <h3 className="text-lg font-medium mb-2">No tests found</h3>
          <p className="text-secondary-600 mb-6">Create your first test to get started with testing phone agents</p>
          <Link to="/tests/create" className="btn btn-primary inline-flex items-center">
            <PlusIcon className="w-5 h-5 mr-1" />
            Create Test
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map(test => (
            <div key={test.id} className="bg-white rounded-lg border border-secondary-200 shadow-card overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTests[test.id] || false}
                      onChange={() => toggleTestSelection(test.id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded mr-2"
                    />
                    <h3 className="text-lg font-semibold text-secondary-900">{test.name}</h3>
                  </div>
                </div>
                <p className="text-secondary-600 mb-4 line-clamp-2">{test.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="text-xs text-secondary-500">
                    {test.tasks.length} {test.tasks.length === 1 ? 'Task' : 'Tasks'}
                  </div>
                  <div className="text-xs text-secondary-500">
                    {test.metrics.length} {test.metrics.length === 1 ? 'Metric' : 'Metrics'}
                  </div>
                  <div className="text-xs text-secondary-500">
                    {test.target_phone_numbers.length} {test.target_phone_numbers.length === 1 ? 'Target Number' : 'Target Numbers'}
                  </div>
                </div>
                <div className="text-xs text-secondary-500 mb-4">
                  Created {new Date(test.created_at).toLocaleDateString()}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link 
                    to={`/tests/${test.id}`} 
                    className="flex-1 btn btn-secondary btn-sm inline-flex items-center justify-center"
                  >
                    <ExternalLinkIcon className="w-4 h-4 mr-1" />
                    View
                  </Link>
                  <Link 
                    to={`/tests/${test.id}/edit`} 
                    className="flex-1 btn btn-primary btn-sm inline-flex items-center justify-center"
                  >
                    <PencilAltIcon className="w-4 h-4 mr-1" />
                    Edit
                  </Link>
                  <Link 
                    to={`/tests/${test.id}/run`} 
                    className="flex-1 btn btn-success btn-sm inline-flex items-center justify-center"
                  >
                    <PlayIcon className="w-4 h-4 mr-1" />
                    Run
                  </Link>
                  <button 
                    onClick={() => handleDeleteTest(test.id)}
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

export default TestsList; 