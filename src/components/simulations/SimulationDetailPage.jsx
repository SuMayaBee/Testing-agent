import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { voiceAgentAPI, callAnalyticsAPI } from '../../lib/api';
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  PhoneIcon,
  ClockIcon,
  CalendarIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import TimelineVisualization from '../common/TimelineVisualization';
import CallRecording from '../common/CallRecording';

// Utility function to normalize scores exactly as the backend does
const normalizeScore = (score) => {
  if (score === undefined || score === null) return null;
  
  // Convert to number if it's a string
  const numScore = typeof score === 'number' ? score : parseFloat(score);
  
  // Ensure score is within valid range (0-10)
  const clampedScore = Math.max(0, Math.min(10, numScore));
  
  // Round to one decimal place using the same algorithm as backend
  // This is equivalent to Python's round(score * 10) / 10
  return Math.round(clampedScore * 10) / 10;
};

// Utility function to format score for display
const formatScore = (score) => {
  if (score === undefined || score === null) return 'N/A';
  return normalizeScore(score).toFixed(1);
};

// Function to format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  // Check if timestamp is a Firebase Timestamp object
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    timestamp = timestamp.toDate();
  } 
  // Check if timestamp is a number (Unix timestamp)
  else if (typeof timestamp === 'number') {
    timestamp = new Date(timestamp);
  }
  // Check if timestamp is a string
  else if (typeof timestamp === 'string') {
    // Try to parse the string as a date
    timestamp = new Date(timestamp);
  }
  // Handle Firebase timestamp with seconds and nanoseconds
  else if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
    timestamp = new Date(timestamp.seconds * 1000 + Math.round(timestamp.nanoseconds / 1000000));
  }
  
  // If we don't have a valid date object, return empty string
  if (!(timestamp instanceof Date) || isNaN(timestamp)) {
    return '';
  }
  
  // Format time as HH:MM:SS
  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

function SimulationDetailPage() {
  const { testId, conversationId } = useParams();
  const { currentOrganizationUsername } = useApp();
  
  // console.log("SimulationDetailPage - Test ID from URL:", testId);
  // console.log("SimulationDetailPage - Conversation ID from URL:", conversationId);
  
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processedMetrics, setProcessedMetrics] = useState([]);
  const [callDuration, setCallDuration] = useState(null);
  
  useEffect(() => {
    async function fetchSimulationDetails() {
      if (!currentOrganizationUsername || !testId || !conversationId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch simulation details
        const result = await voiceAgentAPI.getArchivedConversation(
          currentOrganizationUsername,
          testId,
          conversationId
        );

        console.log("SimulationDetailPage - Raw API result:", result);
        console.log("SimulationDetailPage - Simulation test_id:", result.test_id);
        console.log("SimulationDetailPage - Simulation score:", result.overall_score);
        console.log("SimulationDetailPage - Simulation eval_metadata:", result.eval_metadata);
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        // Process metrics to handle both object and array formats
        // and ensure score values are preserved exactly
        let processedMetricsData = [];
        if (result.metrics_results) {
          console.log("Raw metrics data:", result.metrics_results);
          
          if (Array.isArray(result.metrics_results)) {
            // Already an array, ensure score values are handled properly
            processedMetricsData = result.metrics_results.map(metric => ({
              ...metric,
              score: normalizeScore(metric.score),
              details: metric.details || "No explanation provided"
            }));
          } else if (typeof result.metrics_results === 'object') {
            // Convert from object format to array format
            processedMetricsData = Object.entries(result.metrics_results).map(([metric_id, data]) => {
              // Normalize the score using our consistent function
              const score = normalizeScore(data.score);
              
              return {
                metric_id,
                metric_name: data.metric_name || "Unknown Metric",
                metric_type: data.metric_type || "generic",
                score,
                details: data.details?.explanation || data.details || "No explanation provided",
                improvement_areas: data.improvement_areas || []
              };
            });
          }
          
          console.log("Processed metrics data:", processedMetricsData);
          console.log("Individual metric scores:", processedMetricsData.map(m => ({ name: m.metric_name, score: m.score })));
        }
        
        // Ensure overall score is handled consistently
        if (result.overall_score !== undefined && result.overall_score !== null) {
          result.overall_score = normalizeScore(result.overall_score);
          console.log("Normalized overall score:", result.overall_score);
        }
        
        setSimulation(result);
        setProcessedMetrics(processedMetricsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching simulation details:', err);
        setError(err.message || 'Failed to load simulation details');
        setLoading(false);
      }
    }
    
    fetchSimulationDetails();
  }, [currentOrganizationUsername, testId, conversationId]);
  
  useEffect(() => {
    async function fetchCallDuration() {
      if (simulation?.call_sid) {
        try {
          const { duration } = await callAnalyticsAPI.getCallDuration(simulation.call_sid);
          setCallDuration(duration);
        } catch (err) {
          console.error('Error fetching call duration:', err);
        }
      }
    }

    fetchCallDuration();
  }, [simulation?.call_sid]);
  
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
  
  const getScoreClass = (score) => {
    if (score === undefined || score === null) return 'text-secondary-600';
    // Ensure score is treated as a number
    const numScore = normalizeScore(score);
    if (numScore >= 8) return 'text-green-600';
    if (numScore >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  if (!currentOrganizationUsername) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Simulation Details</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">Please select an organization to view simulation details.</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Simulation Details</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Simulation Details</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-6">
          <p className="text-red-700">{error}</p>
        </div>
        <Link to="/simulations" className="btn btn-secondary inline-flex items-center">
          <ArrowLeftIcon className="w-5 h-5 mr-1" />
          Back to Simulations
        </Link>
      </div>
    );
  }

  console.log("Simulation transcript:", simulation)
  
  if (!simulation) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Simulation Details</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-6">
          <p className="text-red-700">Simulation not found.</p>
        </div>
        <Link to="/simulations" className="btn btn-secondary inline-flex items-center">
          <ArrowLeftIcon className="w-5 h-5 mr-1" />
          Back to Simulations
        </Link>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <Link to="/simulations" className="text-primary-600 hover:text-primary-800 inline-flex items-center">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Simulations
        </Link>
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Simulation: {simulation.test_name}
        </h1>
        <p className="text-secondary-600 mt-1">
          {conversationId}
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Simulation Info Card */}
        <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Simulation Info</h2>
          
          <div className="space-y-3">
            <div className="flex items-start">
              <PhoneIcon className="w-5 h-5 text-secondary-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Phone Number</p>
                <p className="text-secondary-600">{simulation.target_phone_number || 'Unknown'}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <CalendarIcon className="w-5 h-5 text-secondary-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Date & Time</p>
                <p className="text-secondary-600">{formatDate(simulation.created_at)}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <ClockIcon className="w-5 h-5 text-secondary-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Duration</p>
                <p className="text-secondary-600">{formatDuration(simulation.duration)}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <DocumentTextIcon className="w-5 h-5 text-secondary-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Message Count</p>
                <p className="text-secondary-600">{simulation.message_count || 0}</p>
              </div>
            </div>
            
            {simulation.call_sid && (
              <div className="flex items-start">
                <PhoneIcon className="w-5 h-5 text-secondary-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Call SID</p>
                  <p className="text-secondary-600 text-sm break-all">{simulation.call_sid}</p>
                </div>
              </div>
            )}
            
            {simulation.overall_score !== null && simulation.overall_score !== undefined && (
              <div className="flex items-start">
                <div className="w-5 h-5 text-secondary-500 mr-2 mt-0.5 flex justify-center items-center">
                  <span className="font-bold">S</span>
                </div>
                <div>
                  <p className="font-medium">Overall Score</p>
                  <p className={`${getScoreClass(simulation.overall_score)} font-medium`}>
                    {formatScore(simulation.overall_score)} / 10
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <Link 
              to={`/tests/${testId}`} 
              className="btn btn-secondary w-full inline-flex items-center justify-center"
            >
              <DocumentTextIcon className="w-5 h-5 mr-1" />
              View Test Details
            </Link>
          </div>
        </div>
        
        {/* Timeline Card */}
        <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 lg:col-span-2 mb-6">
          <h2 className="text-lg font-semibold mb-4">Response Timeline</h2>
          {simulation.transcript && simulation.transcript.length > 0 ? (
            <TimelineVisualization transcript={simulation.transcript} />
          ) : (
            <p className="text-secondary-500 italic">No timeline data available for this simulation.</p>
          )}
        </div>
        

      </div>
      
      {/* Metrics Card */}
      <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Metrics Evaluation</h2>
        
        {processedMetrics.length > 0 ? (
          <div className="space-y-3">
            {processedMetrics.map((result, index) => (
              <div key={index} className="border border-secondary-200 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h6 className="font-medium">{result.metric_name}</h6>
                    <span className={`
                      px-2 py-0.5 rounded-full text-xs font-medium
                      ${result.metric_type === 'task-specific' ? 'bg-primary-100 text-primary-800' : 'bg-secondary-100 text-secondary-800'}
                    `}>
                      {result.metric_type === 'task-specific' ? 'Task-specific' : 'Generic'}
                    </span>
                  </div>
                  <div className={`
                    px-2 py-1 rounded font-medium text-sm
                    ${getScoreClass(result.score)}
                  `}>
                    Score: {formatScore(result.score)}/10
                  </div>
                </div>
                <p className="text-sm text-secondary-700">{result.details}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-secondary-500 italic">Metrics evaluation not available for this simulation.</p>
        )}
      </div>
      
      {/* Summary and Improvement Areas Card */}
      <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Conversation Analysis</h2>
        
        {/* Summary Section */}
        <div className="mb-6">
          <h3 className="font-medium flex items-center mb-3">
            <DocumentTextIcon className="w-5 h-5 mr-2" />
            Summary
          </h3>
          <div className="bg-secondary-50 p-4 rounded-md text-sm">
            {simulation.eval_metadata?.summary ? (
              <p className="text-secondary-800">{simulation.eval_metadata.summary}</p>
            ) : (
              <p className="text-secondary-500 italic">No summary available for this conversation.</p>
            )}
          </div>
        </div>
        
        {/* Improvement Areas Section */}
        <div>
          <h3 className="font-medium flex items-center mb-3">
            <ClockIcon className="w-5 h-5 mr-2" />
            Improvement Areas
          </h3>
          
          {simulation.eval_metadata?.improvement_areas && simulation.eval_metadata.improvement_areas.length > 0 ? (
            <div className="space-y-3">
              {simulation.eval_metadata.improvement_areas.map((area, index) => (
                <div key={index} className="flex items-start bg-white rounded-md p-3 border border-secondary-200 shadow-sm">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium mr-3 flex-shrink-0
                    ${area.priority === 'high' ? 'bg-red-100 text-red-800' : 
                      area.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'}`}>
                    {area.priority}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{area.area}</div>
                    {area.impact && (
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-secondary-600 mr-1">Impact:</span>
                        <div className="w-24 bg-secondary-200 rounded-full h-1.5 mr-1">
                          <div 
                            className={`h-1.5 rounded-full ${area.impact >= 8 ? 'bg-red-500' : area.impact >= 5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${(area.impact / 10) * 100}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-medium ${
                          area.impact >= 8 ? 'text-red-600' : 
                          area.impact >= 5 ? 'text-yellow-600' : 
                          'text-green-600'
                        }`}>{area.impact}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-secondary-50 p-4 rounded-md text-sm">
              <p className="text-secondary-500 italic">No improvement areas identified for this conversation.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Add this section where you want to display the recording */}
      {simulation?.call_sid && (
        <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h3 className="text-lg font-medium leading-6 text-secondary-900">Call Recording</h3>
          </div>
          <div className="p-6">
            <CallRecording 
              callSid={simulation.call_sid} 
              transcript={simulation.transcript} 
              metricsResults={processedMetrics} 
              testName={simulation.test_name}
            />
          </div>
        </div>
      )}
      
      {/* Add this where you want to display the call duration */}
      {callDuration && (
        <div className="mb-4">
          <span className="text-secondary-600">Call Duration: </span>
          <span className="font-medium">{callDuration} seconds</span>
        </div>
      )}
    </div>
  );
}

export default SimulationDetailPage; 