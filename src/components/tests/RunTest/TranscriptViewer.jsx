import React, { useEffect, useRef } from 'react';
import { 
  DocumentTextIcon, 
  ClockIcon, 
  UserCircleIcon, 
  ChatBubbleLeftRightIcon,
  ArrowLongDownIcon,
  PhoneIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

function TranscriptViewer({ transcript, realtimeMonitoring }) {
  // Create a ref for the transcript container to control scrolling
  const transcriptContainerRef = useRef(null);
  // Ref to store previous transcript length for comparison
  const prevTranscriptLengthRef = useRef(0);
  // Ref to store the previous last speaker
  const prevLastSpeakerRef = useRef(null);
  
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
    
    // If we don't have a valid date object, return empty string
    if (!(timestamp instanceof Date) || isNaN(timestamp)) {
      return '';
    }
    
    // Format time as HH:MM:SS
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Format duration in milliseconds to readable format
  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    
    // Convert to seconds.milliseconds format
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.round(ms % 1000);
    
    // Pad milliseconds to 3 digits
    const paddedMs = milliseconds.toString().padStart(3, '0');
    
    return `${seconds}.${paddedMs}s`;
  };

  // Format duration for response time indicators (more detailed)
  const formatResponseTime = (ms) => {
    if (!ms) return 'N/A';
    
    // If less than 1 second, show milliseconds
    if (ms < 1000) return `${Math.round(ms)}ms`;
    
    const seconds = Math.floor(ms / 1000);
    const remainingMs = Math.round(ms % 1000);
    
    if (seconds < 60) return `${seconds}.${Math.floor(remainingMs/100)}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Get response time speed category
  const getResponseSpeedCategory = (responseTime) => {
    if (!responseTime) return null;
    
    const ms = responseTime;
    
    if (ms < 2000) return 'fast';
    if (ms < 5000) return 'medium';
    return 'slow';
  };

  // Get color for response time indicator
  const getResponseTimeColor = (speed) => {
    if (!speed) return 'bg-gray-200';
    if (speed === 'fast') return 'bg-green-500';
    if (speed === 'medium') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  console.log("TranscriptViewer component - Transcript:", transcript);
  
  // Process transcript with response time calculations
  const processTranscriptWithResponseTimes = (transcriptData) => {
    if (!transcriptData || transcriptData.length === 0) return [];
    
    console.log("🔍 DEBUG: Processing transcript with", transcriptData.length, "messages");
    
    // Convert timestamps and filter valid messages
    const messages = transcriptData.map(msg => {
      let timestamp = null;
      
      if (msg.timestamp) {
        if (typeof msg.timestamp === 'string') {
          timestamp = new Date(msg.timestamp);
        } else if (typeof msg.timestamp === 'number') {
          timestamp = new Date(msg.timestamp);
        } else if (msg.timestamp.toDate && typeof msg.timestamp.toDate === 'function') {
          timestamp = msg.timestamp.toDate();
        } else if (msg.timestamp.seconds) {
          timestamp = new Date(msg.timestamp.seconds * 1000 + (msg.timestamp.nanoseconds || 0) / 1000000);
        }
      }
      
      // CORRECTED speaker mapping: 
      // - 'user' speaker = testing agent (OpenAI doing the testing/calling)
      // - 'agent' speaker = phoneline agent (restaurant's AI being tested)
      const speaker = msg.speaker || 
                     (msg.agent === 'TestAgent' ? 'user' : 
                      msg.agent === 'OrderingAgent' ? 'agent' : 
                      'system');
      
      const messageText = msg.text || msg.message || '';
      
      return {
        ...msg,
        speaker,
        text: messageText,
        timestamp,
        timestampMs: timestamp ? timestamp.getTime() : null
      };
    }).filter(msg => msg.timestamp !== null && msg.timestampMs && msg.text.trim() && msg.speaker !== 'system');
    
    console.log("🔍 DEBUG: Filtered messages by speaker:", messages.map(m => ({speaker: m.speaker, text: m.text.substring(0, 20)})));
    
    if (messages.length === 0) return [];
    
    // Sort by timestamp
    const sortedMessages = [...messages].sort((a, b) => a.timestampMs - b.timestampMs);
    
    // Calculate response times
    const messagesWithResponseTimes = [];
    
    for (let i = 0; i < sortedMessages.length; i++) {
      const currentMsg = sortedMessages[i];
      let responseTime = null;
      let respondingAgent = null;
      
      // Find the next message from a different speaker (actual conversation turn)
      for (let j = i + 1; j < sortedMessages.length; j++) {
        const nextMsg = sortedMessages[j];
        console.log(`🔍 DEBUG: Comparing message ${i} (${currentMsg.speaker}/${currentMsg.agent}) with message ${j} (${nextMsg.speaker}/${nextMsg.agent})`);
        
        // STRICT CHECK: Only calculate response time if speakers are actually different
        if (nextMsg.speaker !== currentMsg.speaker && nextMsg.speaker && currentMsg.speaker) {
          responseTime = nextMsg.timestampMs - currentMsg.timestampMs;
          respondingAgent = nextMsg.speaker;
          console.log(`🔍 DEBUG: Found conversation turn - ${currentMsg.speaker} (${currentMsg.agent}) → ${respondingAgent} (${nextMsg.agent}): ${responseTime}ms`);
          break;
        } else {
          console.log(`🔍 DEBUG: Skipping same speaker - ${currentMsg.speaker} (${currentMsg.agent}) → ${nextMsg.speaker} (${nextMsg.agent})`);
        }
      }
      
      // MULTIPLE SAFETY CHECKS to ensure we never show response times between same agents
      if (responseTime && respondingAgent) {
        // Safety check 1: Ensure speakers are different
        if (respondingAgent === currentMsg.speaker) {
          console.log(`🔍 DEBUG: SAFETY CHECK 1 FAILED - Same speaker detected, nullifying response time`);
          responseTime = null;
          respondingAgent = null;
        }
        
        // Safety check 2: Ensure we have valid different speakers
        if (responseTime && (!currentMsg.speaker || !respondingAgent || currentMsg.speaker === respondingAgent)) {
          console.log(`🔍 DEBUG: SAFETY CHECK 2 FAILED - Invalid speakers, nullifying response time`);
          responseTime = null;
          respondingAgent = null;
        }
        
        // Safety check 3: Ensure response time is positive and reasonable
        if (responseTime && (responseTime <= 0 || responseTime > 300000)) { // Max 5 minutes
          console.log(`🔍 DEBUG: SAFETY CHECK 3 FAILED - Invalid response time: ${responseTime}ms`);
          responseTime = null;
          respondingAgent = null;
        }
      }
      
      // Only include response time if it's an actual turn between different agents
      const responseSpeed = responseTime ? getResponseSpeedCategory(responseTime) : null;
      
      console.log(`🔍 DEBUG: Final result for message ${i}: responseTime=${responseTime}, respondingAgent=${respondingAgent}, responseSpeed=${responseSpeed}`);
      
      messagesWithResponseTimes.push({
        ...currentMsg,
        responseTime: responseTime, // Will be null if same agent speaks consecutively
        respondingAgent: respondingAgent, // Will be null if same agent speaks consecutively
        responseSpeed: responseSpeed // Will be null if no response time
      });
    }
    
    return messagesWithResponseTimes;
  };

  // Calculate average response times for each agent
  const calculateAverageResponseTimes = (processedMessages) => {
    let testingResponseTime = 0;
    let phonelineResponseTime = 0;
    let testingResponseCount = 0;
    let phonelineResponseCount = 0;
    
    processedMessages.forEach(msg => {
      // Only count response times for actual conversation turns (different agents)
      if (msg.responseTime && msg.respondingAgent && msg.respondingAgent !== msg.speaker) {
        if (msg.respondingAgent === 'user') {
          // Testing agent (OpenAI) is responding
          testingResponseTime += msg.responseTime;
          testingResponseCount++;
        } else if (msg.respondingAgent === 'agent') {
          // Phoneline agent (restaurant's AI) is responding
          phonelineResponseTime += msg.responseTime;
          phonelineResponseCount++;
        }
      }
    });
    
    return {
      testingAvg: testingResponseCount > 0 ? testingResponseTime / testingResponseCount : 0,
      phonelineAvg: phonelineResponseCount > 0 ? phonelineResponseTime / phonelineResponseCount : 0,
      testingTotal: testingResponseTime,
      phonelineTotal: phonelineResponseTime,
      testingCount: testingResponseCount,
      phonelineCount: phonelineResponseCount
    };
  };
  
  const processedTranscript = processTranscriptWithResponseTimes(transcript);
  const responseMetrics = calculateAverageResponseTimes(processedTranscript);

  console.log("🔍 DEBUG: Final processed transcript:", processedTranscript.map(m => ({
    speaker: m.speaker,
    agent: m.agent,
    text: m.text.substring(0, 30),
    responseTime: m.responseTime,
    respondingAgent: m.respondingAgent,
    responseSpeed: m.responseSpeed
  })));

  // Use effect to scroll to the bottom when new messages are added
  useEffect(() => {
    if (!transcriptContainerRef.current) return;
    
    // Get current transcript length
    const currentTranscriptLength = transcript.length;
    
    // Determine if we should scroll
    let shouldScroll = false;
    
    // Check if new messages were added
    if (currentTranscriptLength > prevTranscriptLengthRef.current) {
      // Always scroll if there are new messages
      shouldScroll = true;
      
      // Check if the speaker changed (especially important to detect)
      if (transcript.length > 0 && prevLastSpeakerRef.current) {
        const lastMessage = transcript[transcript.length - 1];
        // If the speaker changed, definitely scroll to show this change
        if (lastMessage.speaker !== prevLastSpeakerRef.current) {
          shouldScroll = true;
        }
      }
    }
    
    // Perform the scroll if needed
    if (shouldScroll) {
      const container = transcriptContainerRef.current;
      // Smooth scroll to the bottom
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
    
    // Update the refs for next comparison
    prevTranscriptLengthRef.current = currentTranscriptLength;
    if (transcript.length > 0) {
      prevLastSpeakerRef.current = transcript[transcript.length - 1].speaker;
    }
  }, [transcript]); // Re-run when transcript changes
  
  return (
    <div className="mb-6">
      <h3 className="font-medium flex items-center mb-4">
        <DocumentTextIcon className="w-5 h-5 mr-2" />
        Live Conversation & Response Analysis
        {realtimeMonitoring && (
          <span className="ml-3 flex items-center text-green-600 text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Live Recording
          </span>
        )}
      </h3>
      
      {/* Response Time Analysis Cards */}
      {processedTranscript.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm">
            <div className="flex items-center mb-3">
              <div className="bg-blue-500 rounded-full p-2 mr-3">
                <ComputerDesktopIcon className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-semibold text-blue-900">Testing Agent (OpenAI)</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Average Response:</span>
                <span className="font-bold text-blue-900">{formatDuration(responseMetrics.testingAvg)}</span>
              </div>
              <div className="flex justify-between text-xs text-blue-600">
                <span>Total Time:</span>
                <span>{formatDuration(responseMetrics.testingTotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-blue-600">
                <span>Responses:</span>
                <span>{responseMetrics.testingCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 shadow-sm">
            <div className="flex items-center mb-3">
              <div className="bg-purple-500 rounded-full p-2 mr-3">
                <PhoneIcon className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-semibold text-purple-900">Phoneline Agent (Restaurant AI)</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-purple-700">Average Response:</span>
                <span className="font-bold text-purple-900">{formatDuration(responseMetrics.phonelineAvg)}</span>
              </div>
              <div className="flex justify-between text-xs text-purple-600">
                <span>Total Time:</span>
                <span>{formatDuration(responseMetrics.phonelineTotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-purple-600">
                <span>Responses:</span>
                <span>{responseMetrics.phonelineCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div 
        ref={transcriptContainerRef}
        className="bg-gray-50 rounded-xl border border-gray-200 shadow-inner max-h-96 overflow-y-auto"
      >
        {processedTranscript.length > 0 ? (
          <div className="p-4 space-y-4">
            {processedTranscript.map((message, index) => (
              <div key={index} className="space-y-2">
                {/* Chat Message */}
                <div className={`flex ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                    message.speaker === 'user' 
                      ? 'bg-blue-500 text-white rounded-br-md' 
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                  }`}>
                    {/* Speaker info */}
                    <div className={`text-xs font-medium mb-1 ${
                      message.speaker === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <div className="flex items-center">
                        {message.speaker === 'user' ? (
                          <ComputerDesktopIcon className="h-3 w-3 mr-1" />
                        ) : (
                          <PhoneIcon className="h-3 w-3 mr-1" />
                        )}
                        {message.speaker === 'user' ? 'Testing Agent' : 'Restaurant AI'}
                        <span className="ml-2 opacity-75">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {/* Debug info */}
                        <span className="ml-2 text-xs opacity-50">
                          (s:{message.speaker}, a:{message.agent})
                        </span>
                      </div>
                    </div>
                    
                    {/* Message text */}
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 italic">Conversation will appear here as the test runs...</p>
          </div>
        )}
      </div>

      {/* Response Speed Legend */}
      {processedTranscript.length > 0 && (
        <div className="mt-4 flex items-center justify-center space-x-6 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-gray-600">Fast (&lt;2s)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-gray-600">Medium (2-5s)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-gray-600">Slow (&gt;5s)</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TranscriptViewer; 