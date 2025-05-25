import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { voiceAgentAPI, testsAPI } from '../../lib/api';
import CurrentConversationViewer from './CurrentConversationViewer';
import { 
  PlayIcon, 
  ArrowRightIcon,
  DocumentTextIcon,
  PhoneIcon,
  ClockIcon,
  ExclamationCircleIcon,
  StarIcon
} from '@heroicons/react/24/outline';

function SimulationsPage() {
  const { currentOrganizationUsername } = useApp();
  const navigate = useNavigate();
  const [simulations, setSimulations] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchData() {
      if (!currentOrganizationUsername) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch both simulations and tests in parallel
        const [simulationsResult, testsResult] = await Promise.all([
          voiceAgentAPI.getAllArchivedConversations(currentOrganizationUsername),
          testsAPI.getTests(currentOrganizationUsername)
        ]);
        
        if (simulationsResult.error) {
          throw new Error(simulationsResult.error);
        }
        
        if (testsResult.error) {
          throw new Error(testsResult.error);
        }
        
        setSimulations(simulationsResult.archived_conversations || []);
        setTests(testsResult.tests || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load data');
        setLoading(false);
      }
    }
    
    fetchData();
  }, [currentOrganizationUsername]);
  
  const getScoreClass = (score) => {
    if (score === undefined || score === null) return 'text-secondary-400 bg-secondary-100';
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };
  
  const getStatusClass = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-secondary-600 bg-secondary-100';
    }
  };
  
  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    // Handle both Firestore timestamp objects and regular JS dates
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    } else if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    } else {
      try {
        return new Date(timestamp).toLocaleString();
      } catch (e) {
        return 'Invalid Date';
      }
    }
  };
  
  const handleViewSimulation = (testId, conversationId) => {
    // Navigate to a view for the specific simulation
    navigate(`/simulations/${testId}/${conversationId}`);
  };
  
  if (!currentOrganizationUsername) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Simulations</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">Please select an organization to view simulations.</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Simulations</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Simulations</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Current Conversations Section */}
      {tests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Conversations</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tests.slice(0, 4).map((test) => (
              <CurrentConversationViewer 
                key={test.id} 
                testId={test.id} 
                testName={test.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Archived Simulations Section */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Archived Simulations</h2>
      </div>
      
      {simulations.length === 0 ? (
        <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 text-center">
          <DocumentTextIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-secondary-900 mb-2">No Simulations Yet</h2>
          <p className="text-secondary-600 mb-4">
            You haven't run any test simulations yet. Run a test to see results here.
          </p>
          <Link to="/tests" className="btn btn-primary">
            Go to Tests
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-secondary-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead>
                <tr className="bg-secondary-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Test
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Target Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {simulations.map((simulation) => (
                  <tr key={`${simulation.test_id}-${simulation.id}`} className="hover:bg-secondary-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-secondary-900">{simulation.test_name}</div>
                      <div className="text-sm text-secondary-500">{simulation.test_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                      {simulation.target_phone_number || "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                      {formatDate(simulation.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(simulation.call_status)}`}>
                        {simulation.call_status ? simulation.call_status.charAt(0).toUpperCase() + simulation.call_status.slice(1) : "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-secondary-900">
                        <ClockIcon className="h-4 w-4 mr-1 text-secondary-500" />
                        {formatDuration(simulation.duration)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                      {simulation.message_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {simulation.overall_score !== undefined && simulation.overall_score !== null ? (
                          <>
                            <StarIcon className="h-4 w-4 mr-1 text-yellow-500" />
                            <span className={getScoreClass(simulation.overall_score)}>
                              {parseFloat(simulation.overall_score).toFixed(1)}
                            </span>
                          </>
                        ) : (
                          <span className="text-secondary-400">Not evaluated</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewSimulation(simulation.test_id, simulation.id)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        View Details
                      </button>
                      <Link 
                        to={`/tests/${simulation.test_id}`} 
                        className="text-secondary-600 hover:text-secondary-900"
                      >
                        View Test
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimulationsPage; 