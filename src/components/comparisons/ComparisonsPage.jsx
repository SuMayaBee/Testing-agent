import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { testsAPI } from '../../lib/api';
import { 
  ChartBarIcon,
  ArrowRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

// Mock data for demonstration
const MOCK_TESTS = [
  {
    id: 'test123',
    name: 'Basic Phone Agent Test',
    description: 'Tests basic customer service functions',
    target_phone_numbers: ['+1234567890', '+1987654321', '+1555123456'],
    simulations_count: 5,
    has_comparisons: true,
    latest_simulation: '2023-06-10T14:30:00Z',
    best_score: 9.1
  },
  {
    id: 'test456',
    name: 'Advanced Support Flow',
    description: 'Tests complex support scenarios',
    target_phone_numbers: ['+1234567890', '+1987654321'],
    simulations_count: 2,
    has_comparisons: true,
    latest_simulation: '2023-06-08T16:45:00Z',
    best_score: 8.5
  },
  {
    id: 'test789',
    name: 'Sales Conversion Test',
    description: 'Tests sales conversion capabilities',
    target_phone_numbers: ['+1234567890'],
    simulations_count: 1,
    has_comparisons: false,
    latest_simulation: '2023-06-05T10:15:00Z',
    best_score: 7.2
  }
];

function ComparisonsPage() {
  const { currentOrganizationUsername } = useApp();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchTests() {
      if (!currentOrganizationUsername) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // This would be replaced with an actual API call
        // const testsData = await testsAPI.getTestsWithSimulations(currentOrganizationUsername);
        
        // For now, use mock data
        setTimeout(() => {
          setTests(MOCK_TESTS);
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Error fetching tests:', err);
        setError(err.message || 'Failed to load tests');
        setLoading(false);
      }
    }
    
    fetchTests();
  }, [currentOrganizationUsername]);
  
  const getScoreClass = (score) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  if (!currentOrganizationUsername) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Test Comparisons</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">Please select an organization to view test comparisons.</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Test Comparisons</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Test Comparisons</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <p className="text-secondary-600 mb-6">
        Compare results across different tests and phone numbers to find the best performing versions of your phone agent.
      </p>
      
      {tests.length === 0 ? (
        <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 text-center">
          <DocumentTextIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-secondary-900 mb-2">No Tests With Comparisons</h2>
          <p className="text-secondary-600 mb-4">
            You need to run tests with multiple phone numbers to enable comparisons.
          </p>
          <Link to="/tests" className="btn btn-primary">
            Go to Tests
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div 
              key={test.id} 
              className="bg-white rounded-lg border border-secondary-200 shadow-card overflow-hidden"
            >
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-2">{test.name}</h2>
                <p className="text-secondary-600 mb-4 line-clamp-2">{test.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary-600">Phone Numbers:</span>
                    <span className="text-sm font-medium">{test.target_phone_numbers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary-600">Simulations:</span>
                    <span className="text-sm font-medium">{test.simulations_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary-600">Best Score:</span>
                    <span className={`text-sm font-medium ${getScoreClass(test.best_score)}`}>
                      {test.best_score.toFixed(1)}/10
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-secondary-600">Latest Run:</span>
                    <span className="text-sm font-medium">
                      {new Date(test.latest_simulation).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-secondary-200">
                  <Link
                    to={`/tests/${test.id}`}
                    className="text-secondary-600 hover:text-secondary-900 text-sm"
                  >
                    View Test
                  </Link>
                  
                  <Link
                    to={`/tests/${test.id}/compare`}
                    className={`btn btn-sm ${test.has_comparisons ? 'btn-primary' : 'btn-secondary'} inline-flex items-center`}
                    disabled={!test.has_comparisons}
                  >
                    <ChartBarIcon className="w-4 h-4 mr-1" />
                    {test.has_comparisons ? 'Compare Results' : 'No Comparisons'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ComparisonsPage; 