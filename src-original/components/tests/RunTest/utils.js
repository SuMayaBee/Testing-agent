import { voiceAgentAPI, callAnalyticsAPI } from '../../../lib/api';
import { normalizeScore, STATUSES } from './constants';

// Helper function to format metrics for display
export function formatMetricsForDisplay(transcriptResult, testMetrics) {
  if (!transcriptResult || !transcriptResult.metrics_results) {
    console.warn("No metrics results found in transcript data");
    return [];
  }
  
  console.log("Raw metrics data:", transcriptResult.metrics_results);
  
  const formattedMetrics = Object.entries(transcriptResult.metrics_results).map(([metric_id, data]) => {
    // Extract base information
    const metric = {
    metric_id,
      metric_name: data.metric_name || testMetrics?.find(m => m.id === metric_id)?.name || "Unknown Metric",
      metric_type: data.metric_type || testMetrics?.find(m => m.id === metric_id)?.type || "generic",
    score: normalizeScore(data.score),
      details: data.details?.explanation || "No explanation provided"
    };
    
    // Extract key points if available
    if (data.details?.key_points) {
      metric.key_points = data.details.key_points;
    }
    
    // Extract category scores if available
    if (data.details?.category_scores) {
      metric.category_scores = data.details.category_scores;
    }
    
    // Extract improvement areas if available
    if (data.details?.improvement_areas) {
      metric.improvement_areas = data.details.improvement_areas;
    } else if (data.improvement_areas) {
      metric.improvement_areas = data.improvement_areas;
    } else {
      metric.improvement_areas = [];
    }
    
    return metric;
  });

  console.log("Formatted metrics:", formattedMetrics);
  return formattedMetrics;
}

// Process transcript to ensure timestamps are properly formatted
export function processTranscript(transcript) {
  if (!transcript || !Array.isArray(transcript)) return [];
  
  // Log sample timestamp information for debugging
  if (transcript.length > 0) {
    const sampleMessage = transcript[0];
    console.log('Timestamp data sample:', {
      hasTimestamp: 'timestamp' in sampleMessage,
      timestampType: sampleMessage.timestamp ? typeof sampleMessage.timestamp : 'none',
      timestampValue: sampleMessage.timestamp,
      isFirebaseTimestamp: sampleMessage.timestamp && 
                          typeof sampleMessage.timestamp === 'object' && 
                          'seconds' in sampleMessage.timestamp && 
                          'nanoseconds' in sampleMessage.timestamp,
    });
  }
  
  // Process each message to ensure proper speaker mapping
  return transcript.map(message => {
    // Ensure proper speaker mapping
    let speaker = message.speaker;
    
    // Map backend agent names to frontend speaker names
    if (message.agent === 'OrderingAgent' || message.speaker === 'user') {
      speaker = 'user'; // The phoneline agent (restaurant manager)
    } else if (message.agent === 'TestAgent' || message.speaker === 'agent') {
      speaker = 'agent'; // The testing agent (simulated customer)
    } else if (message.agent === 'system' || message.speaker === 'system') {
      speaker = 'system'; // System messages
    }
    
    // Ensure we have a text field
    const text = message.text || message.message || '';
    
    return {
      ...message,
      speaker,
      text
    };
  });
}

// Add new function to handle call recordings
export async function fetchCallRecording(callSid) {
  if (!callSid) return null;
  
  try {
    const recordings = await callAnalyticsAPI.getRecordings(callSid);
    if (recordings && recordings.length > 0) {
      return recordings[0]; // Return the first recording by default
    }
    return null;
  } catch (err) {
    console.error('Error fetching call recording:', err);
    return null;
  }
}

// Function to setup transcript polling
export function setupTranscriptPolling({
  currentOrganizationUsername,
  testId,
  callSid,
  setTranscript,
  persistentTranscriptRef,
  setTasksInFlow,
  setMetricsResults,
  setOverallScore,
  setSimulationStatus,
  setSavedSimulationId,
  testMetrics,
  setCallRecording
}) {
  let callCompleted = false;
  let pollingCount = 0;
  const maxPolls = 120; // Maximum 2 minutes of polling (with 1-second intervals)
  
  const pollTranscript = async () => {
    if (callCompleted || pollingCount >= maxPolls) {
      return;
    }
    
    pollingCount++;
    console.log(`Polling transcript #${pollingCount} for test ${testId} with call SID ${callSid}`);
    
    try {
      // Poll the transcript API
      const transcriptResult = await voiceAgentAPI.getTranscript(
        currentOrganizationUsername,
        testId,
        callSid
      );

      console.log("Transcript result:", transcriptResult);
      
      // Debug log the received transcript
      if (transcriptResult.transcript) {
        console.log(`Received transcript with ${transcriptResult.transcript.length} messages`);
        if (transcriptResult.transcript.length > 0) {
          // Apply processing to ensure timestamps are properly formatted
          transcriptResult.transcript = processTranscript(transcriptResult.transcript);
          console.log(`Last transcript message: ${JSON.stringify(transcriptResult.transcript[transcriptResult.transcript.length - 1])}`);
        }
      }
      
      if (transcriptResult.error) {
        console.warn("Transcript polling error:", transcriptResult.error);
        // Still set an empty transcript or use any available partial data
        if (transcriptResult.transcript && transcriptResult.transcript.length > 0) {
          setTranscript(transcriptResult.transcript);
          persistentTranscriptRef.current = transcriptResult.transcript;
        } else if (persistentTranscriptRef.current.length > 0) {
          // Use our persistent transcript as fallback if API returns empty
          console.log(`⚠️ API returned empty transcript. Using persistent transcript (${persistentTranscriptRef.current.length} messages)`);
          // Don't update state if we're falling back to the same data
        }
      } else {
        // Only update if we got a non-empty transcript that's better than what we have
        if (transcriptResult.transcript && 
            (transcriptResult.transcript.length > 0 && 
             transcriptResult.transcript.length >= persistentTranscriptRef.current.length)) {
          console.log(`Updating transcript (${transcriptResult.transcript.length} messages)`);
          setTranscript(transcriptResult.transcript);
          persistentTranscriptRef.current = transcriptResult.transcript;
        } else if (transcriptResult.transcript && transcriptResult.transcript.length === 0 && 
                   persistentTranscriptRef.current.length > 0) {
          console.log(`⚠️ API returned empty transcript. Keeping persistent transcript (${persistentTranscriptRef.current.length} messages)`);
          // Keep our persistent transcript if API returns empty
          transcriptResult.transcript = persistentTranscriptRef.current;
        }
        
        // Check if call has completed
        if (transcriptResult.call_completed) {
          callCompleted = true;
          
          // Mark all tasks as completed
          setTasksInFlow(prev => prev.map(task => ({ ...task, status: STATUSES.COMPLETED })));
          
          // Store the current transcript to avoid losing it during state transitions
          const currentTranscript = persistentTranscriptRef.current.length > 0 ? 
            [...persistentTranscriptRef.current] : 
            [...persistentTranscriptRef.current]; // Double check second reference
          console.log(`✅ Call completed - Saving current transcript (${currentTranscript.length} messages) to prevent flashing`);
          
          // Fetch call recording when call is completed
          if (callSid && setCallRecording) {
            try {
              const recording = await fetchCallRecording(callSid);
              if (recording) {
                console.log('Call recording found:', recording);
                setCallRecording(recording);
              }
            } catch (recordingError) {
              console.error('Error fetching call recording:', recordingError);
            }
          }
          
          // Check if metrics results are already available from the backend
          if (transcriptResult.metrics_results && Object.keys(transcriptResult.metrics_results).length > 0) {
            console.log("Metrics results available:", transcriptResult.metrics_results);
            
            // Ensure we don't lose transcript during this transition
            if (!transcriptResult.transcript || transcriptResult.transcript.length === 0 ||
                transcriptResult.transcript.length < currentTranscript.length) {
              console.log("Preserving existing transcript as new transcript is empty or shorter");
              transcriptResult.transcript = currentTranscript;
            }
            
            // Format metrics for display
            const formattedMetrics = formatMetricsForDisplay(transcriptResult, testMetrics);

            console.log("Formatted metrics:", formattedMetrics);
            console.log("Individual metric scores:", formattedMetrics.map(m => ({ name: m.metric_name, score: m.score })));
            console.log("Overall score:", transcriptResult.overall_score);
            
            // Store the eval_metadata in the transcript if it exists
            if (transcriptResult.eval_metadata) {
              const transcriptToUpdate = transcriptResult.transcript.length > 0 ? 
                transcriptResult.transcript : currentTranscript;
                
              const updatedTranscript = [...transcriptToUpdate];
              
              if (updatedTranscript.length > 0) {
                updatedTranscript[0] = {
                  ...updatedTranscript[0],
                  eval_metadata: transcriptResult.eval_metadata
                };
                setTranscript(updatedTranscript);
                persistentTranscriptRef.current = updatedTranscript;
              } else {
                // If somehow we still have an empty transcript, create one with metadata
                const newTranscript = [{
                  speaker: 'system',
                  text: 'Transcript initialized with metadata',
                  eval_metadata: transcriptResult.eval_metadata,
                  timestamp: new Date()
                }];
                setTranscript(newTranscript);
                persistentTranscriptRef.current = newTranscript;
              }
            } else if (transcriptResult.transcript && transcriptResult.transcript.length > 0) {
              // Just update transcript if no metadata but we have messages
              setTranscript(transcriptResult.transcript);
              persistentTranscriptRef.current = transcriptResult.transcript;
            }
            
            setMetricsResults(formattedMetrics);
            setOverallScore(normalizeScore(transcriptResult.overall_score));
            setSimulationStatus(STATUSES.COMPLETED);
            setSavedSimulationId(null);
            
            return; // Stop polling since we have complete data
          }
          
          // If no metrics yet, wait for a short time and check again
          // This allows time for the backend LLM evaluation to complete
          const checkForFinalMetrics = async (attemptsLeft = 3, delay = 5000) => {
            console.log(`Checking for final metrics. Attempts left: ${attemptsLeft}, delay: ${delay}ms`);
            
            try {
              // Save current transcript to prevent flashing - CRITICAL to prevent transcript disappearing
              const currentTranscriptSnapshot = persistentTranscriptRef.current.length > 0 ? 
                [...persistentTranscriptRef.current] : 
                (persistentTranscriptRef.current.length > 0 ? [...persistentTranscriptRef.current] : currentTranscript);
                
              console.log(`📊 Using persistent transcript (${currentTranscriptSnapshot.length} messages) for metrics check`);
              
              const finalResult = await voiceAgentAPI.getTranscript(
                currentOrganizationUsername,
                testId,
                callSid
              );
              
              // Ensure we keep the transcript if the API response doesn't include it
              // or if it somehow returns empty
              if (!finalResult.transcript || finalResult.transcript.length === 0) {
                console.log(`Transcript missing or empty in final result (attempt ${4-attemptsLeft}), preserving current transcript (${currentTranscriptSnapshot.length} messages)`);
                finalResult.transcript = currentTranscriptSnapshot;
              } else if (finalResult.transcript.length < currentTranscriptSnapshot.length) {
                console.log(`New transcript has fewer messages (${finalResult.transcript.length}) than current (${currentTranscriptSnapshot.length}), keeping current transcript`);
                finalResult.transcript = currentTranscriptSnapshot;
              } else {
                // We have a new transcript that's at least as good as the current one
                console.log(`Updating transcript with new transcript (${finalResult.transcript.length} messages)`);
                setTranscript(finalResult.transcript);
                persistentTranscriptRef.current = finalResult.transcript;
              }
              
              if (finalResult.metrics_results && Object.keys(finalResult.metrics_results).length > 0) {
                // Format metrics for display
                const formattedMetrics = formatMetricsForDisplay(finalResult, testMetrics);
                
                console.log(`✅ Final metrics results received on attempt ${4-attemptsLeft}:`, formattedMetrics);
                console.log("Individual metric scores:", formattedMetrics.map(m => ({ name: m.metric_name, score: m.score })));
                console.log("Final overall score:", finalResult.overall_score);
                
                // Always use the most complete transcript
                const bestTranscript = (finalResult.transcript && finalResult.transcript.length > currentTranscriptSnapshot.length) ?
                  finalResult.transcript : currentTranscriptSnapshot;
                
                // Store the eval_metadata in the transcript if it exists
                if (finalResult.eval_metadata) {
                  // Make sure we have at least one transcript entry
                  const baseTranscript = bestTranscript.length > 0 ? bestTranscript : [{
                    speaker: 'system',
                    text: 'Call completed',
                    timestamp: new Date()
                  }];
                  
                  const updatedTranscript = [...baseTranscript];
                  updatedTranscript[0] = {
                    ...updatedTranscript[0],
                    eval_metadata: finalResult.eval_metadata
                  };
                  
                  setTranscript(updatedTranscript);
                  persistentTranscriptRef.current = updatedTranscript;
                } else {
                  // If no metadata, just make sure we're using the best transcript
                  setTranscript(bestTranscript);
                  persistentTranscriptRef.current = bestTranscript;
                }
                
                // Update state with metrics
                setMetricsResults(formattedMetrics);
                setOverallScore(normalizeScore(finalResult.overall_score));
                setSimulationStatus(STATUSES.COMPLETED);
                setSavedSimulationId(null);
                return true; // Success
              } else {
                console.log(`⚠️ No metrics results available yet (attempt ${4-attemptsLeft})`);
                
                // Always make sure we're displaying something
                if (currentTranscriptSnapshot.length > 0) {
                  setTranscript(currentTranscriptSnapshot);
                }
                
                // If we have attempts left, retry with exponential backoff
                if (attemptsLeft > 1) {
                  // Wait longer each time
                  const nextDelay = delay * 1.5;
                  setTimeout(() => {
                    checkForFinalMetrics(attemptsLeft - 1, nextDelay);
                  }, delay);
                  return false; // Still waiting
                } else {
                  console.log("❌ All retry attempts exhausted. No metrics available.");
                  
                  // Final attempt to ensure we show something
                  if (persistentTranscriptRef.current.length > 0) {
                    console.log(`Using persistent transcript (${persistentTranscriptRef.current.length} messages) as final fallback`);
                    setTranscript(persistentTranscriptRef.current);
                  }
                  
                  setSimulationStatus(STATUSES.COMPLETED);
                  setSavedSimulationId(null);
                  return false; // Failed
                }
              }
            } catch (err) {
              console.error(`Error getting final metrics (attempt ${4-attemptsLeft}):`, err);
              
              // Ensure transcript doesn't disappear on error - use our persistent ref
              if (persistentTranscriptRef.current.length > 0) {
                console.log(`⚠️ Preserving transcript during error handling (${persistentTranscriptRef.current.length} messages)`);
                setTranscript(persistentTranscriptRef.current);
              } else if (currentTranscript.length > 0) {
                console.log(`⚠️ Falling back to original transcript during error (${currentTranscript.length} messages)`);
                setTranscript(currentTranscript);
                persistentTranscriptRef.current = currentTranscript;
              }
              
              // If we have attempts left, retry with exponential backoff
              if (attemptsLeft > 1) {
                // Wait longer each time
                const nextDelay = delay * 1.5;
                setTimeout(() => {
                  checkForFinalMetrics(attemptsLeft - 1, nextDelay);
                }, delay);
                return false; // Still waiting
              } else {
                console.log("❌ All retry attempts exhausted due to errors.");
                setSimulationStatus(STATUSES.COMPLETED);
                setSavedSimulationId(null);
                return false; // Failed
              }
            }
          };
          
          // Start checking for metrics with the initial delay
          // First check after 8 seconds to give LLM time to evaluate
          setTimeout(() => {
            checkForFinalMetrics(3, 8000);
          }, 8000);
          
          return; // Stop polling when call is completed
        }
        
        // Update task status based on progress (this remains similar to original approach)
        // Use a simplified version based on message count
        const messageCount = transcriptResult.message_count || 0;
        if (messageCount > 5 && setTasksInFlow) {
          setTasksInFlow(prev => {
            if (prev.length > 1) {
              const updated = [...prev];
              if (updated[0]) updated[0].status = STATUSES.COMPLETED;
              if (updated[1]) updated[1].status = STATUSES.RUNNING;
              return updated;
            }
            return prev;
          });
        } else if (messageCount > 10 && setTasksInFlow) {
          setTasksInFlow(prev => {
            if (prev.length > 2) {
              const updated = [...prev];
              if (updated[1]) updated[1].status = STATUSES.COMPLETED;
              if (updated[2]) updated[2].status = STATUSES.RUNNING;
              return updated;
            }
            return prev;
          });
        }
      }
      
      // Continue polling while call is in progress
      setTimeout(pollTranscript, 1000);
    } catch (pollError) {
      console.error('Error polling transcript:', pollError);
      
      // On polling error, make sure we preserve transcript
      if (persistentTranscriptRef.current.length > 0) {
        console.log(`⚠️ Preserved transcript during polling error (${persistentTranscriptRef.current.length} messages)`);
      }
      
      setTimeout(pollTranscript, 2000); // Longer delay on error
    }
  };
  
  // Start polling
  pollTranscript();
} 