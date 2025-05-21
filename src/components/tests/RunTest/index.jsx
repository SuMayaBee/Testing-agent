import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { voiceAgentAPI } from '../../../lib/api';

// Import custom components
import TaskList from './TaskList';
import TranscriptViewer from './TranscriptViewer';
import MetricsEvaluation from './MetricsEvaluation';
import TestConfiguration from './TestConfiguration';
import TestExecutionHeader from './TestExecutionHeader';
import TestExecutionInfo from './TestExecutionInfo';
import { RunningActionButtons, CompletedActionButtons } from './ActionButtons';
import TimelineVisualization from '../../common/TimelineVisualization';
import CallRecording from '../../common/CallRecording';

// Import utilities
import { STATUSES } from './constants';
import { 
  fetchTestData, 
  refreshTestMetrics, 
  saveConversation,
  cleanTestMetrics,
  cancelTest 
} from './api';
import { setupTranscriptPolling } from './utils';

function RunTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { currentOrganizationUsername } = useApp();
  
  console.log("RunTest component - Test ID from URL:", testId);
  
  const [test, setTest] = useState(null);
  const [testTasks, setTestTasks] = useState([]);
  const [testMetrics, setTestMetrics] = useState([]);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState('');
  const [simulationStatus, setSimulationStatus] = useState(STATUSES.PENDING);
  const [simulationId, setSimulationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [savedSimulationId, setSavedSimulationId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  
  // Combined transcript for the entire test
  const [transcript, setTranscript] = useState([]);
  // Track which tasks are included in the flow
  const [tasksInFlow, setTasksInFlow] = useState([]);
  // Combined metrics results for all metrics
  const [metricsResults, setMetricsResults] = useState([]);
  // Overall score
  const [overallScore, setOverallScore] = useState(null);
  
  // Track if the conversation has been archived
  const [archived, setArchived] = useState(false);
  
  // Add a new state for cleaning status
  const [cleaningMetrics, setCleaningMetrics] = useState(false);
  
  // Add a ref to maintain transcript persistence across re-renders and state changes
  const persistentTranscriptRef = useRef([]);
  
  const [callSid, setCallSid] = useState(null);
  
  // Fetch test details and associated tasks/metrics
  useEffect(() => {
    async function loadTestData() {
      if (!currentOrganizationUsername || !testId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        await fetchTestData(
          currentOrganizationUsername, 
          testId, 
          setTest, 
          setTestTasks, 
          setTestMetrics, 
          setSelectedPhoneNumber
        );
      } catch (err) {
        console.error('Error fetching test data:', err);
        setError(err.message || 'Failed to load test data');
      } finally {
        setLoading(false);
      }
    }
    
    loadTestData();
  }, [currentOrganizationUsername, testId]);
  
  // When component unmounts, auto-save the conversation if it's completed and not already saved
  useEffect(() => {
    return () => {
      // If a test was running and completed, but not archived yet, do it automatically
      if (simulationStatus === STATUSES.COMPLETED && !savedSimulationId && !archived) {
        console.log("Auto-saving conversation on component unmount");
        // This happens silently in the background when the user navigates away
        handleSaveResultsQuietly();
      }
    };
  }, [simulationStatus, savedSimulationId, archived]);
  
  // When transcript updates, also update our persistent ref
  useEffect(() => {
    if (transcript && transcript.length > 0) {
      persistentTranscriptRef.current = transcript;
      // For debugging
      console.log(`📝 Updated persistent transcript ref (${transcript.length} messages)`);
    }
  }, [transcript]);
  
  const handleRunTest = async () => {
    if (!selectedPhoneNumber) {
      setError('Please select a phone number to call');
      return;
    }
    
    try {
      // Reset to initial state if coming from completed state
      if (simulationStatus === STATUSES.COMPLETED) {
        setSimulationStatus(STATUSES.PENDING);
        return;
      }

      setRunning(true);
      setError(null);
      
      // First, refresh metrics to ensure we include any new ones
      console.log("Refreshing metrics before running test...");
      await refreshTestMetrics(
        currentOrganizationUsername, 
        testId, 
        setTest, 
        setTestTasks, 
        setTestMetrics
      );
      
      setSimulationStatus(STATUSES.RUNNING);
      
      // Create a simulation ID 
      const newSimulationId = `sim_${Date.now()}`;
      setSimulationId(newSimulationId);
      
      // Reset transcript and metrics
      setTranscript([]);
      persistentTranscriptRef.current = [];
      setMetricsResults([]);
      setOverallScore(null);
      setCallSid(null); // Reset call SID
      
      // Track which tasks will be part of this flow
      setTasksInFlow(testTasks.map(task => ({
        task_id: task.id,
        task_name: task.name,
        status: STATUSES.PENDING
      })));
      
      // Actually execute the test by calling the backend API
      console.log(`Executing test ${testId} with phone number ${selectedPhoneNumber}`);
      
      // Call the backend API to initiate the call
      try {
        const result = await voiceAgentAPI.runTestCall(
          currentOrganizationUsername,
          testId, 
          selectedPhoneNumber
        );
        
        console.log("Call initiated with call_sid:", result.call_sid);
        console.log("Full call result:", result);
        
        // Store the call SID
        setCallSid(result.call_sid);
        
        // Add initial transcript entry
        const initialTranscript = [{ 
          speaker: 'system', 
          text: `Call initiated to ${selectedPhoneNumber} with call SID: ${result.call_sid}`,
          timestamp: new Date()
        }];
        
        setTranscript(initialTranscript);
        persistentTranscriptRef.current = initialTranscript;
        
        // Set the first task to running
        if (tasksInFlow.length > 0) {
          setTasksInFlow(prev => {
            const updated = [...prev];
            updated[0] = { ...updated[0], status: STATUSES.RUNNING };
            return updated;
          });
        }
        
        // Set up polling
        setupTranscriptPolling({
          currentOrganizationUsername,
          testId,
          callSid: result.call_sid,
          setTranscript,
          persistentTranscriptRef,
          setTasksInFlow,
          setMetricsResults,
          setOverallScore,
          setSimulationStatus,
          setSavedSimulationId,
          testMetrics
        });
      } catch (callError) {
        console.error('Error initiating call:', callError);
        setError(callError.message || 'Failed to initiate call');
        setRunning(false);
        setSimulationStatus(STATUSES.PENDING);
      }
    } catch (err) {
      console.error('Error running test:', err);
      setError(err.message || 'Failed to run test');
      setRunning(false);
      setSimulationStatus(STATUSES.PENDING);
    }
  };
  
  // Handle save function with robust error handling
  const handleSaveResults = async () => {
    try {
      // Make sure we have a valid transcript before saving
      if (!transcript || transcript.length === 0) {
        console.warn("Attempted to save with empty transcript. Using persistent transcript if available.");
        if (persistentTranscriptRef.current.length > 0) {
          console.log(`Restored transcript from persistent ref (${persistentTranscriptRef.current.length} messages) for saving`);
          // Update the state for UI display
          setTranscript(persistentTranscriptRef.current);
        }
      }
      
      // Use whichever transcript has content - prefer state but fall back to ref
      const transcriptToSave = transcript?.length > 0 ? 
                                transcript : 
                                persistentTranscriptRef.current;
      
      // If we still don't have transcript, show an error
      if (!transcriptToSave || transcriptToSave.length === 0) {
        throw new Error("Cannot save without transcript data");
      }
      
      try {
        const result = await saveConversation(
          currentOrganizationUsername,
          testId,
          selectedPhoneNumber,
          transcriptToSave,
          metricsResults,
          overallScore,
          test
        );
        
        setSavedSimulationId(result.id || `saved_${Date.now()}`);
        setArchived(true);
        alert('Simulation results saved successfully!');
      } catch (apiError) {
        console.error("API error saving conversation:", apiError);
        // Show specific error for 404 which is likely a backend issue
        if (apiError.message && apiError.message.includes("404")) {
          alert(`Error saving results: API endpoint not found (404). This appears to be a backend configuration issue.`);
        } else {
          alert(`Error saving results: ${apiError.message}`);
        }
      }
    } catch (err) {
      console.error("Error preparing to save simulation:", err);
      alert(`Error preparing to save results: ${err.message}`);
    }
  };
    
  // Silent save function for auto-saving
  const handleSaveResultsQuietly = async () => {
    try {
      // Similar logic to ensure transcript isn't lost
      const transcriptToSave = transcript?.length > 0 ?
                               transcript :
                               persistentTranscriptRef.current;
                               
      if (!transcriptToSave || transcriptToSave.length === 0) {
        console.error("Cannot auto-save without transcript data");
        return;
      }
      
      try {
        const result = await saveConversation(
          currentOrganizationUsername,
          testId,
          selectedPhoneNumber,
          transcriptToSave,
          metricsResults,
          overallScore,
          test
        );
        
        setSavedSimulationId(result.id || `saved_${Date.now()}`);
        setArchived(true);
        console.log("Simulation results auto-saved with ID:", result.id);
      } catch (apiError) {
        console.error("API error auto-saving conversation:", apiError);
        // No alert for silent save
      }
    } catch (err) {
      console.error("Error auto-saving simulation:", err);
    }
  };
  
  // Handle metrics cleaning
  const handleCleanMetrics = async () => {
    if (!currentOrganizationUsername || !testId) return;
    
    try {
      setCleaningMetrics(true);
      setError(null);
      
      const result = await cleanTestMetrics(
        currentOrganizationUsername, 
        testId, 
        setTest, 
        setTestMetrics
      );
      
      // Show a success message
      alert(result.message);
      
    } catch (err) {
      console.error('Error cleaning metrics:', err);
      setError(err.message || 'Failed to clean metrics');
    } finally {
      setCleaningMetrics(false);
    }
  };
  
  // Handle call cancellation
  const handleCancelTest = async () => {
    if (!simulationId || !currentOrganizationUsername || !testId) {
      console.error("Missing required data for cancellation");
      return;
    }
    
    try {
      setCancelling(true);
      setError(null);
      
      const result = await cancelTest(currentOrganizationUsername, testId);
      
      if (result.status === "success" || result.status === "warning") {
        // Add a system message to the transcript
        const updatedTranscript = [...transcript];
        updatedTranscript.push({
          speaker: 'system',
          text: 'Call was cancelled by user.',
          timestamp: new Date()
        });
        setTranscript(updatedTranscript);
        persistentTranscriptRef.current = updatedTranscript;
        
        // Update the simulation status
        setSimulationStatus(STATUSES.COMPLETED);
        
        // Mark all tasks as failed
        setTasksInFlow(prev => prev.map(task => ({ ...task, status: STATUSES.FAILED })));
        
        // Don't auto-save the cancelled test to avoid it appearing in simulations
        setArchived(true); // Mark as archived so it doesn't get auto-saved on unmount
        setSavedSimulationId('cancelled'); // Mark with a special ID to prevent further save attempts
      } else {
        // Show error
        setError(result.message || "Failed to cancel call");
      }
    } catch (err) {
      console.error('Error cancelling test:', err);
      setError(err.message || 'Failed to cancel test');
    } finally {
      setCancelling(false);
      setRunning(false);
    }
  };
  
  if (!currentOrganizationUsername) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Run Test</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">Please select an organization to run this test.</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Run Test</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }
  
  if (error && simulationStatus !== STATUSES.FAILED) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Run Test</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
        <div className="mt-4">
          <Link to={`/tests/${testId}`} className="btn btn-secondary inline-flex items-center">
            <ArrowLeftIcon className="w-5 h-5 mr-1" />
            Back to Test
          </Link>
        </div>
      </div>
    );
  }
  
  if (!test) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Run Test</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-red-700">Test not found or you don't have permission to access it.</p>
        </div>
        <div className="mt-4">
          <Link to="/tests" className="btn btn-secondary inline-flex items-center">
            <ArrowLeftIcon className="w-5 h-5 mr-1" />
            Back to Tests
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <Link to={`/tests/${testId}`} className="text-primary-600 hover:text-primary-800 inline-flex items-center">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Test
        </Link>
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Run Test: {test.name}</h1>
        <p className="text-secondary-600 mt-1">{test.description}</p>
      </div>
      
      {simulationStatus === STATUSES.PENDING && (
        <TestConfiguration 
          test={test}
          error={error}
          selectedPhoneNumber={selectedPhoneNumber}
          setSelectedPhoneNumber={setSelectedPhoneNumber}
          running={running}
          cleaningMetrics={cleaningMetrics}
          handleRunTest={handleRunTest}
          handleCleanMetrics={handleCleanMetrics}
          testId={testId}
        />
      )}
      
      {simulationStatus !== STATUSES.PENDING && (
        <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 mb-6">
          <TestExecutionHeader 
            simulationStatus={simulationStatus} 
          />
          
          {error && simulationStatus === STATUSES.FAILED && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <TestExecutionInfo
            simulationId={simulationId}
            selectedPhoneNumber={selectedPhoneNumber}
            overallScore={overallScore}
          />
          
          <TaskList tasksInFlow={tasksInFlow} />
          
          {transcript.length > 0 && (
            <TimelineVisualization transcript={transcript} />
          )}
          
          <TranscriptViewer transcript={transcript} />
          
          {simulationStatus === STATUSES.RUNNING && (
            <RunningActionButtons 
              handleCancelTest={handleCancelTest} 
              cancelling={cancelling} 
            />
          )}
          
          {simulationStatus === STATUSES.COMPLETED && (
            <>
              <MetricsEvaluation 
                metricsResults={metricsResults} 
                transcript={transcript} 
              />
              
              <CompletedActionButtons 
                testId={testId} 
                handleRunTest={handleRunTest} 
              />
            </>
          )}
          
          {simulationStatus === STATUSES.COMPLETED && callSid && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">Call Recording</h3>
              <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6">
                <CallRecording 
                  callSid={callSid} 
                  transcript={transcript}
                  metricsResults={metricsResults}
                  testName={test?.name || 'Test Run'}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RunTest; 