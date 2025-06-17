import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { voiceAgentAPI } from '../../../lib/api';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase-config';

// Import custom components
import TaskList from './TaskList';
import TranscriptViewer from './TranscriptViewer';
import MetricsEvaluation from './MetricsEvaluation';
import TestConfiguration from './TestConfiguration';
import TestExecutionHeader from './TestExecutionHeader';
import TestExecutionInfo from './TestExecutionInfo';
import { RunningActionButtons, CompletedActionButtons } from './ActionButtons';
import CallRecording from '../../common/CallRecording';
import AudioTranscription from './AudioTranscription';

// Import utilities
import { STATUSES } from './constants';
import { 
  fetchTestData, 
  refreshTestMetrics, 
  saveConversation,
  cleanTestMetrics,
  cancelTest 
} from './api';
import { setupTranscriptPolling, formatMetricsForDisplay } from './utils';
import { normalizeScore } from './constants';
// import { realtimeMonitor } from './realtimeMonitor';
import { firebaseTranscriptService } from './firebaseTranscriptService';

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
  
  // Add state for manual Firebase metrics fetching
  const [fetchingMetrics, setFetchingMetrics] = useState(false);
  
  // Add a ref to maintain transcript persistence across re-renders and state changes
  const persistentTranscriptRef = useRef([]);
  
  const [callSid, setCallSid] = useState(null);
  
  // Add Firebase real-time subscription state
  const [firebaseSubscription, setFirebaseSubscription] = useState(null);
  
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
      // Cleanup Firebase subscription
      if (firebaseSubscription && typeof firebaseSubscription === 'function') {
        console.log("🔥 Cleaning up Firebase real-time subscription");
        firebaseSubscription();
        setFirebaseSubscription(null);
      }
      
      // If a test was running and completed, but not archived yet, do it automatically
      if (simulationStatus === STATUSES.COMPLETED && !savedSimulationId && !archived) {
        console.log("Auto-saving conversation on component unmount");
        // This happens silently in the background when the user navigates away
        handleSaveResultsQuietly();
      }
      
      // Reset Firebase transcript service
      firebaseTranscriptService.reset();
    };
  }, [simulationStatus, savedSimulationId, archived, firebaseSubscription]);
  
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
        
        // Initialize Firebase transcript service
        try {
          await firebaseTranscriptService.initializeCurrentConversation(
            currentOrganizationUsername,
            testId,
            selectedPhoneNumber,
            result.call_sid
          );
          console.log("✅ Firebase transcript service initialized");
          
          // Set up Firebase real-time listener to ensure we don't miss any updates
          console.log("🔥 Setting up Firebase real-time listener...");
          const unsubscribe = voiceAgentAPI.subscribeToCurrentConversation(
            currentOrganizationUsername,
            testId,
            (response) => {
              if (response.success && response.data) {
                const conversationData = response.data;
                console.log(`🔥 Firebase real-time update: ${conversationData.messages?.length || 0} messages`);
                
                // Update transcript if we have messages
                if (conversationData.messages && conversationData.messages.length > 0) {
                  // Convert Firebase messages to transcript format
                  const firebaseTranscript = conversationData.messages
                    .filter(msg => msg.agent !== 'system') // Filter out system messages
                    .map(msg => ({
                      speaker: msg.agent === 'TestAgent' ? 'user' : 'agent',
                      text: msg.message || '',
                      timestamp: msg.timestamp,
                      start_time: msg.start_time,
                      end_time: msg.end_time,
                      agent: msg.agent,
                      session_id: msg.session_id
                    }));
                  
                  // Only update if we have more messages than current transcript
                  if (firebaseTranscript.length > transcript.length) {
                    console.log(`🔥 Updating transcript from Firebase: ${firebaseTranscript.length} messages (was ${transcript.length})`);
                    setTranscript(firebaseTranscript);
                    persistentTranscriptRef.current = firebaseTranscript;
                  }
                }
                
                // Check for metrics results
                if (conversationData.metrics_results && Object.keys(conversationData.metrics_results).length > 0) {
                  console.log("🔥 Firebase metrics update:", conversationData.metrics_results);
                  
                  // Format metrics for display
                  const formattedMetrics = Object.entries(conversationData.metrics_results).map(([metricId, metricData]) => ({
                    metric_id: metricId,
                    metric_name: metricData.metric_name || 'Unknown Metric',
                    score: metricData.score || 0,
                    details: metricData.details?.explanation || 'No explanation available',
                    improvement_areas: metricData.improvement_areas || []
                  }));
                  
                  setMetricsResults(formattedMetrics);
                  
                  if (conversationData.overall_score !== undefined) {
                    setOverallScore(conversationData.overall_score);
                  }
                  
                  // If we have metrics, the test is likely completed
                  if (conversationData.call_status === 'completed') {
                    setSimulationStatus(STATUSES.COMPLETED);
                  }
                }
              } else {
                console.log("🔥 Firebase listener: No data or error:", response.error);
              }
            }
          );
          
          // Store the unsubscribe function
          setFirebaseSubscription(() => unsubscribe);
          console.log("✅ Firebase real-time listener set up successfully");
          
          // Save initial transcript entry to Firebase
          const initialFirebaseMessage = {
            agent: 'system',
            message: `Call initiated to ${selectedPhoneNumber} with call SID: ${result.call_sid}`,
            session_id: result.call_sid,
            timestamp: new Date().toISOString()
          };
          
          try {
            await firebaseTranscriptService.addMessage(initialFirebaseMessage);
            console.log("✅ Saved initial message to Firebase");
          } catch (messageError) {
            console.error("❌ Failed to save initial message to Firebase:", messageError);
          }
        } catch (firebaseError) {
          console.error("❌ Failed to initialize Firebase transcript service:", firebaseError);
          // Continue with the test even if Firebase initialization fails
        }
        
        // Add initial transcript entry for local display
        const initialTranscript = [{ 
          speaker: 'system', 
          text: `Call initiated to ${selectedPhoneNumber} with call SID: ${result.call_sid}`,
          timestamp: new Date()
        }];
        
        setTranscript(initialTranscript);
        persistentTranscriptRef.current = initialTranscript;
        
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
      } catch (err) {
        console.error('Error running test:', err);
        setError(err.message || 'Failed to run test');
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
    if (!simulationId && !callSid) {
      setError('No active test to cancel');
      return;
    }
    
    setCancelling(true);
    setError(null);
    
    try {
      // Cleanup Firebase subscription before cancelling
      if (firebaseSubscription && typeof firebaseSubscription === 'function') {
        console.log("🔥 Cleaning up Firebase subscription before cancelling");
        firebaseSubscription();
        setFirebaseSubscription(null);
      }
      
      await cancelTest(
        currentOrganizationUsername,
        testId,
        callSid,
        setSimulationStatus,
        setRunning,
      );
      
      // Clear call SID after successful cancellation
      setCallSid(null);
    } catch (err) {
      console.error('Error cancelling test:', err);
      setError(err.message || 'Failed to cancel test');
    } finally {
      setCancelling(false);
    }
  };
  
  // Manual function to test Firebase connection (for debugging)
  const handleTestFirebaseConnection = async () => {
    try {
      console.log("🔥 Testing Firebase connection...");
      const result = await firebaseTranscriptService.testConnection();
      
      if (result) {
        console.log("✅ Firebase connection test successful");
        alert("✅ Firebase connection test successful! Check console for details.");
      } else {
        console.error("❌ Firebase connection test failed");
        alert("❌ Firebase connection test failed. Check console for details.");
      }
    } catch (error) {
      console.error("❌ Error testing Firebase connection:", error);
      alert(`❌ Error testing Firebase connection: ${error.message}`);
    }
  };
  
  // Manual function to save current transcript to Firebase (for debugging)
  const handleSaveTranscriptToFirebase = async () => {
    if (!firebaseTranscriptService.isInitialized) {
      console.error("❌ Firebase transcript service not initialized");
      alert("Firebase service not initialized. Please start a test first.");
      return;
    }

    try {
      const currentTranscript = persistentTranscriptRef.current.length > 0 ? 
        persistentTranscriptRef.current : transcript;
      
      if (currentTranscript.length === 0) {
        alert("No transcript data to save");
        return;
      }

      console.log(`🔥 Manually saving ${currentTranscript.length} messages to Firebase...`);
      
      const result = await firebaseTranscriptService.saveCompleteTranscript(currentTranscript);
      
      if (result) {
        console.log("✅ Successfully saved complete transcript to Firebase");
        alert(`Successfully saved ${currentTranscript.length} messages to Firebase!`);
      } else {
        console.error("❌ Failed to save transcript to Firebase");
        alert("Failed to save transcript to Firebase");
      }
    } catch (error) {
      console.error("❌ Error saving transcript to Firebase:", error);
      alert(`Error saving transcript: ${error.message}`);
    }
  };

  // Manual function to trigger metrics evaluation (for debugging)
  const handleManualMetricsEvaluation = async () => {
    if (!callSid || !currentOrganizationUsername || !testId) {
      alert("Missing required data for metrics evaluation (callSid, organization, or testId)");
      return;
    }

    try {
      console.log("🔍 Manually triggering metrics evaluation...");
      console.log("📊 Using callSid:", callSid);
      console.log("📊 Using testId:", testId);
      console.log("📊 Using organization:", currentOrganizationUsername);

      // Force fetch the latest transcript with metrics
      const transcriptResult = await voiceAgentAPI.getTranscript(
        currentOrganizationUsername,
        testId,
        callSid
      );

      console.log("📊 Manual metrics fetch result:", transcriptResult);

      if (transcriptResult.metrics_results && Object.keys(transcriptResult.metrics_results).length > 0) {
        // Format metrics for display
        const formattedMetrics = formatMetricsForDisplay(transcriptResult, testMetrics);
        
        console.log("✅ Manual metrics evaluation successful:", formattedMetrics);
        
        // Update state with metrics
        setMetricsResults(formattedMetrics);
        setOverallScore(normalizeScore(transcriptResult.overall_score));
        
        // Update transcript if we got a better one
        if (transcriptResult.transcript && transcriptResult.transcript.length > 0) {
          setTranscript(transcriptResult.transcript);
          persistentTranscriptRef.current = transcriptResult.transcript;
        }
        
        alert(`✅ Metrics evaluation successful! Found ${formattedMetrics.length} metrics.`);
      } else {
        console.warn("⚠️ No metrics results found in manual fetch");
        alert("⚠️ No metrics results available yet. The backend may still be processing the evaluation.");
      }
    } catch (error) {
      console.error("❌ Error in manual metrics evaluation:", error);
      alert(`❌ Error triggering metrics evaluation: ${error.message}`);
    }
  };
  
  // Direct Firebase metrics fetching function
  const fetchMetricsFromFirebase = async () => {
    if (!currentOrganizationUsername || !testId) {
      console.log("❌ Missing organization or test ID for metrics fetch");
      return null;
    }

    try {
      console.log("🔍 Fetching metrics directly from Firebase...");
      console.log(`📁 Path: organizations/${currentOrganizationUsername}/tests/${testId}/conversations/current`);
      
      // Get the conversation document directly from Firebase
      const conversationPath = `organizations/${currentOrganizationUsername}/tests/${testId}/conversations/current`;
      const docRef = doc(db, conversationPath);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.log("❌ No conversation document found");
        return null;
      }
      
      const conversationData = docSnap.data();
      console.log("📊 Conversation data keys:", Object.keys(conversationData));
      
      // Check for metrics_results
      const metricsResults = conversationData.metrics_results;
      const overallScore = conversationData.overall_score;
      const evalMetadata = conversationData.eval_metadata;
      
      console.log("🎯 Metrics results found:", !!metricsResults);
      console.log("🎯 Overall score found:", overallScore);
      console.log("🎯 Eval metadata found:", !!evalMetadata);
      
      if (metricsResults && typeof metricsResults === 'object') {
        console.log("✅ Found metrics results with", Object.keys(metricsResults).length, "metrics");
        
        // Convert Firebase metrics format to frontend format
        const formattedMetrics = Object.entries(metricsResults).map(([metricId, metricData]) => ({
          metric_id: metricId,
          metric_name: metricData.metric_name || 'Unknown Metric',
          score: metricData.score || 0,
          details: metricData.details?.explanation || 'No explanation available',
          improvement_areas: metricData.improvement_areas || []
        }));
        
        console.log("📊 Formatted metrics:", formattedMetrics.map(m => ({
          name: m.metric_name,
          score: m.score
        })));
        
        // Update state with the fetched metrics
        setMetricsResults(formattedMetrics);
        setOverallScore(overallScore);
        
        return {
          metrics: formattedMetrics,
          overallScore,
          evalMetadata
        };
      } else {
        console.log("❌ No valid metrics_results found in conversation");
        return null;
      }
      
    } catch (error) {
      console.error("❌ Error fetching metrics from Firebase:", error);
      return null;
    }
  };
  
  // Manual Firebase metrics fetch handler
  const handleFetchMetricsFromFirebase = async () => {
    setFetchingMetrics(true);
    try {
      const result = await fetchMetricsFromFirebase();
      if (result) {
        console.log("✅ Successfully fetched metrics from Firebase manually");
      } else {
        console.log("⚠️ No metrics found in Firebase");
        setError("No metrics found in Firebase. The evaluation may not be complete yet.");
      }
    } catch (error) {
      console.error("❌ Error in manual Firebase metrics fetch:", error);
      setError(`Failed to fetch metrics: ${error.message}`);
    } finally {
      setFetchingMetrics(false);
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
            onSaveTranscriptToFirebase={handleSaveTranscriptToFirebase}
            onTestFirebaseConnection={handleTestFirebaseConnection}
            onManualMetricsEvaluation={handleManualMetricsEvaluation}
            callSid={callSid}
            showMetricsButton={simulationStatus === STATUSES.COMPLETED && (!metricsResults || metricsResults.length === 0)}
          />
          
          <TaskList tasksInFlow={tasksInFlow} />
          
          {transcript.length > 0 && (
            <TranscriptViewer transcript={transcript} />
          )}
          
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
                handleFetchMetricsFromFirebase={handleFetchMetricsFromFirebase}
                fetchingMetrics={fetchingMetrics}
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

          {simulationStatus === STATUSES.COMPLETED && callSid && (
            <div className="mt-6">
              <AudioTranscription 
                testId={testId}
                organizationId={currentOrganizationUsername}
                callSid={callSid}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RunTest; 