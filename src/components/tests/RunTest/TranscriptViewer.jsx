import React, { useEffect, useRef } from 'react';
import { 
  DocumentTextIcon, 
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon as TimeIcon,
  PhoneIcon,
  ComputerDesktopIcon,
  ArrowLongDownIcon
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


  // Get response time speed category
  const getResponseSpeedCategory = (responseTime) => {
    if (!responseTime) return null;
    
    const ms = responseTime;
    
    if (ms < 2000) return 'fast';
    if (ms < 5000) return 'medium';
    return 'slow';
  };


  // Calculate response delays between different agents
  const calculateResponseDelays = (transcriptData) => {
    if (!transcriptData || transcriptData.length === 0) return [];
    
    const delays = [];
    
    // Sort messages by start_time first (preferred), then by timestamp
    const sortedMessages = [...transcriptData]
      .filter(msg => {
        const hasTimestamp = msg.timestamp || msg.start_time;
        const hasAgent = msg.agent;
        const isNotSystem = msg.agent !== 'system';
        const isValidAgent = msg.agent === 'OrderingAgent' || msg.agent === 'TestAgent';
        
        console.log(`🔍 Filtering message: agent=${msg.agent}, hasTimestamp=${!!hasTimestamp}, isValidAgent=${isValidAgent}, text="${(msg.message || msg.text || '').substring(0, 30)}"`);
        
        return hasTimestamp && hasAgent && isNotSystem && isValidAgent;
      })
      .sort((a, b) => {
        // Priority: start_time > timestamp
        const timeA = a.start_time?.toDate ? a.start_time.toDate() : 
                     a.start_time ? new Date(a.start_time) :
                     a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const timeB = b.start_time?.toDate ? b.start_time.toDate() : 
                     b.start_time ? new Date(b.start_time) :
                     b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return timeA - timeB;
      });

    console.log("🔍 Calculating response delays for", sortedMessages.length, "messages");
    console.log("🔍 Messages by agent:", sortedMessages.map(m => ({ 
      agent: m.agent, 
      message: (m.message || m.text || '').substring(0, 30),
      timestamp: m.timestamp?.toDate ? m.timestamp.toDate().toISOString() : m.timestamp,
      start_time: m.start_time?.toDate ? m.start_time.toDate().toISOString() : m.start_time,
      end_time: m.end_time?.toDate ? m.end_time.toDate().toISOString() : m.end_time
    })));

    for (let i = 0; i < sortedMessages.length - 1; i++) {
      const currentMsg = sortedMessages[i];
      const nextMsg = sortedMessages[i + 1];
      
      console.log(`🔍 Checking transition ${i}: ${currentMsg.agent} → ${nextMsg.agent}`);
      
      // Only calculate delay if agents are different
      if (currentMsg.agent !== nextMsg.agent) {
        // Try multiple timing strategies to find the most accurate delay
        let currentTime, nextTime, delay, strategy = '';
        let validDelayFound = false;
        
        // Strategy 1: Use end_time → start_time (most accurate for response delays)
        if (currentMsg.end_time && nextMsg.start_time) {
          currentTime = currentMsg.end_time?.toDate ? currentMsg.end_time.toDate() : new Date(currentMsg.end_time);
          nextTime = nextMsg.start_time?.toDate ? nextMsg.start_time.toDate() : new Date(nextMsg.start_time);
          delay = nextTime - currentTime;
          strategy = 'end_time → start_time';
          
          console.log(`🔍 Strategy 1 (${strategy}): ${delay}ms`);
          
          // Only accept if it's a reasonable positive delay
          if (delay > 0 && delay < 60000) {
            validDelayFound = true;
            console.log(`🔍 ✅ Strategy 1 accepted: ${delay}ms`);
          }
        }
        
        // Strategy 2: Use timestamp → timestamp (if Strategy 1 failed)
        if (!validDelayFound && currentMsg.timestamp && nextMsg.timestamp) {
          currentTime = currentMsg.timestamp?.toDate ? currentMsg.timestamp.toDate() : new Date(currentMsg.timestamp);
          nextTime = nextMsg.timestamp?.toDate ? nextMsg.timestamp.toDate() : new Date(nextMsg.timestamp);
          delay = nextTime - currentTime;
          strategy = 'timestamp → timestamp';
          
          console.log(`🔍 Strategy 2 (${strategy}): ${delay}ms`);
          
          // Only accept if it's a reasonable positive delay
          if (delay > 0 && delay < 60000) {
            validDelayFound = true;
            console.log(`🔍 ✅ Strategy 2 accepted: ${delay}ms`);
          }
        }
        
        // Strategy 3: Use start_time → start_time (conversation turn timing)
        if (!validDelayFound && currentMsg.start_time && nextMsg.start_time) {
          currentTime = currentMsg.start_time?.toDate ? currentMsg.start_time.toDate() : new Date(currentMsg.start_time);
          nextTime = nextMsg.start_time?.toDate ? nextMsg.start_time.toDate() : new Date(nextMsg.start_time);
          delay = nextTime - currentTime;
          strategy = 'start_time → start_time (turn gap)';
          
          console.log(`🔍 Strategy 3 (${strategy}): ${delay}ms`);
          
          // Only accept if it's a reasonable positive delay
          if (delay > 0 && delay < 60000) {
            validDelayFound = true;
            console.log(`🔍 ✅ Strategy 3 accepted: ${delay}ms`);
          }
        }
        
        // Only include if we found a valid, real delay
        if (validDelayFound) {
          const fromMessage = currentMsg.message || currentMsg.text || '';
          const toMessage = nextMsg.message || nextMsg.text || '';
          
          delays.push({
            fromAgent: currentMsg.agent,
            toAgent: nextMsg.agent,
            delay: delay, // Use the real calculated delay
            strategy: strategy,
            fromMessage: fromMessage.substring(0, 50) + (fromMessage.length > 50 ? '...' : ''),
            toMessage: toMessage.substring(0, 50) + (toMessage.length > 50 ? '...' : ''),
            timestamp: currentTime
          });
          
          console.log(`🔍 ✅ Real delay found: ${currentMsg.agent} → ${nextMsg.agent}: ${delay}ms (strategy: ${strategy})`);
        } else {
          console.log(`🔍 ❌ No valid delay found for ${currentMsg.agent} → ${nextMsg.agent} (overlapping or invalid timing)`);
          
          // Log the timing details for analysis
          if (currentMsg.end_time && nextMsg.start_time) {
            const endTime = currentMsg.end_time?.toDate ? currentMsg.end_time.toDate() : new Date(currentMsg.end_time);
            const startTime = nextMsg.start_time?.toDate ? nextMsg.start_time.toDate() : new Date(nextMsg.start_time);
            const overlap = startTime - endTime;
            console.log(`🔍 📊 Timing analysis: ${currentMsg.agent} ends at ${endTime.toISOString()}, ${nextMsg.agent} starts at ${startTime.toISOString()} = ${overlap}ms overlap`);
          }
        }
      } else {
        console.log(`🔍 ⏭️ Skipping same agent: ${currentMsg.agent} → ${nextMsg.agent}`);
      }
    }

    console.log("🔍 Found", delays.length, "response delays");
    console.log("🔍 Delays breakdown:", delays.map(d => `${d.fromAgent} → ${d.toAgent}: ${d.delay}ms`));
    return delays;
  };

  // Calculate response time statistics
  const calculateResponseStats = (delays) => {
    const orderingToTest = delays.filter(d => d.fromAgent === 'OrderingAgent' && d.toAgent === 'TestAgent');
    const testToOrdering = delays.filter(d => d.fromAgent === 'TestAgent' && d.toAgent === 'OrderingAgent');
    
    const calculateStats = (delayArray) => {
      if (delayArray.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
      
      const delays = delayArray.map(d => d.delay);
      return {
        avg: delays.reduce((a, b) => a + b, 0) / delays.length,
        min: Math.min(...delays),
        max: Math.max(...delays),
        count: delays.length
      };
    };

    return {
      orderingToTest: calculateStats(orderingToTest),
      testToOrdering: calculateStats(testToOrdering),
      allDelays: delays
    };
  };

  // Simple Bar Chart Component
  const ResponseTimeChart = ({ delays }) => {
    const stats = calculateResponseStats(delays);
    
    const chartData = [
      {
        label: 'OrderingAgent → TestAgent',
        value: stats.orderingToTest.avg,
        count: stats.orderingToTest.count,
        color: 'bg-purple-500'
      },
      {
        label: 'TestAgent → OrderingAgent',
        value: stats.testToOrdering.avg,
        count: stats.testToOrdering.count,
        color: 'bg-blue-500'
      }
    ];

    const maxValue = Math.max(...chartData.map(d => d.value));

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h4 className="font-semibold text-gray-900">Average Response Times</h4>
        </div>
        
        <div className="space-y-4">
          {chartData.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">{formatDuration(item.value)}</span>
                  <span className="text-xs text-gray-500 ml-2">({item.count} responses)</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${item.color} transition-all duration-500`}
                  style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Response Time Distribution Chart
  const ResponseDistributionChart = ({ delays }) => {
    const buckets = [
      { label: '< 1s', min: 0, max: 1000, color: 'bg-green-500' },
      { label: '1-2s', min: 1000, max: 2000, color: 'bg-green-400' },
      { label: '2-3s', min: 2000, max: 3000, color: 'bg-yellow-500' },
      { label: '3-5s', min: 3000, max: 5000, color: 'bg-orange-500' },
      { label: '> 5s', min: 5000, max: Infinity, color: 'bg-red-500' }
    ];

    const distribution = buckets.map(bucket => ({
      ...bucket,
      count: delays.filter(d => d.delay >= bucket.min && d.delay < bucket.max).length
    }));

    const maxCount = Math.max(...distribution.map(d => d.count));

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center mb-4">
          <TimeIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h4 className="font-semibold text-gray-900">Response Time Distribution</h4>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          {distribution.map((bucket, index) => (
            <div key={index} className="text-center">
              <div className="h-20 flex items-end justify-center mb-2">
                <div 
                  className={`w-full ${bucket.color} rounded-t transition-all duration-500`}
                  style={{ height: `${maxCount > 0 ? (bucket.count / maxCount) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-600">{bucket.label}</div>
              <div className="text-xs font-bold text-gray-900">{bucket.count}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Timeline visualization
  const ResponseTimeline = ({ delays }) => {
    if (delays.length === 0) return null;

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        {/* <div className="flex items-center mb-4">
          <TimeIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h4 className="font-semibold text-gray-900">Response Time Timeline</h4>
        </div> */}
        
        {/* <div className="space-y-3 max-h-64 overflow-y-auto">
          {delays.slice(-10).map((delay, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                {delay.fromAgent === 'OrderingAgent' ? (
                  <PhoneIcon className="h-4 w-4 text-purple-600" />
                ) : (
                  <ComputerDesktopIcon className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <ArrowLongDownIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-shrink-0">
                {delay.toAgent === 'OrderingAgent' ? (
                  <PhoneIcon className="h-4 w-4 text-purple-600" />
                ) : (
                  <ComputerDesktopIcon className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600 truncate">
                  {delay.fromMessage} → {delay.toMessage}
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  delay.delay < 2000 ? 'bg-green-100 text-green-800' :
                  delay.delay < 5000 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {formatDuration(delay.delay)}
                </span>
              </div>
            </div>
          ))}
        </div> */}
      </div>
    );
  };

  console.log("TranscriptViewer component - Transcript:", transcript);
  console.log("🔍 DEBUG: Raw transcript data:", transcript.map(m => ({ 
    agent: m.agent, 
    message: m.message?.substring(0, 30),
    timestamp: m.timestamp,
    start_time: m.start_time,
    end_time: m.end_time
  })));
  
  // Process transcript with response time calculations
  const processTranscriptWithResponseTimes = (transcriptData) => {
    if (!transcriptData || transcriptData.length === 0) return [];
    
    console.log("🔍 DEBUG: Processing transcript with", transcriptData.length, "messages");
    
    // Convert timestamps and filter valid messages
    const messages = transcriptData.map(msg => {
      let timestamp = null;
      let startTime = null;
      
      // Process timestamp (fallback timing)
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
      
      // Process start_time (preferred timing for sorting)
      if (msg.start_time) {
        if (typeof msg.start_time === 'string') {
          startTime = new Date(msg.start_time);
        } else if (typeof msg.start_time === 'number') {
          startTime = new Date(msg.start_time);
        } else if (msg.start_time.toDate && typeof msg.start_time.toDate === 'function') {
          startTime = msg.start_time.toDate();
        } else if (msg.start_time.seconds) {
          startTime = new Date(msg.start_time.seconds * 1000 + (msg.start_time.nanoseconds || 0) / 1000000);
        }
      }
      
      // Use start_time if available, otherwise fall back to timestamp
      const sortingTime = startTime || timestamp;
      
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
        start_time: startTime,
        sortingTime,
        sortingTimeMs: sortingTime ? sortingTime.getTime() : null
      };
    }).filter(msg => msg.sortingTime !== null && msg.sortingTimeMs && msg.text.trim() && msg.speaker !== 'system');
    
    console.log("🔍 DEBUG: Filtered messages by speaker:", messages.map(m => ({
      speaker: m.speaker, 
      text: m.text.substring(0, 20),
      start_time: m.start_time?.toISOString?.() || m.start_time,
      timestamp: m.timestamp?.toISOString?.() || m.timestamp
    })));
    
    if (messages.length === 0) return [];
    
    // Sort by start_time (preferred) or timestamp (fallback)
    const sortedMessages = [...messages].sort((a, b) => a.sortingTimeMs - b.sortingTimeMs);
    
    console.log("🔍 DEBUG: Messages sorted by start_time:", sortedMessages.map(m => ({
      speaker: m.speaker,
      agent: m.agent,
      text: m.text.substring(0, 20),
      start_time: m.start_time?.toISOString?.() || 'N/A',
      sorting_time: m.sortingTime?.toISOString?.() || 'N/A'
    })));
    
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
          responseTime = nextMsg.sortingTimeMs - currentMsg.sortingTimeMs;
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
  const responseDelays = calculateResponseDelays(transcript);
  const responseStats = calculateResponseStats(responseDelays);

  console.log("🔍 DEBUG: Final processed transcript:", processedTranscript.map(m => ({
    speaker: m.speaker,
    agent: m.agent,
    text: m.text.substring(0, 30),
    responseTime: m.responseTime,
    respondingAgent: m.respondingAgent,
    responseSpeed: m.responseSpeed
  })));

  console.log("🔍 DEBUG: Response delays:", responseDelays);
  console.log("🔍 DEBUG: Response stats:", responseStats);

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
      
      {/* Response Time Analysis Charts */}
      {responseDelays.length > 0 && (
        <div className="mb-6 space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Response Time Analytics
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ResponseTimeChart delays={responseDelays} />
            <ResponseDistributionChart delays={responseDelays} />
          </div>
          
          <ResponseTimeline delays={responseDelays} />
          
          {/* Summary Stats */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
            <h5 className="font-medium text-gray-900 mb-3">Response Time Summary</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{formatDuration(responseStats.orderingToTest.avg)}</div>
                <div className="text-gray-600">OrderingAgent Avg</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{formatDuration(responseStats.testToOrdering.avg)}</div>
                <div className="text-gray-600">TestAgent Avg</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{responseStats.orderingToTest.count}</div>
                <div className="text-gray-600">OrderingAgent Responses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{responseStats.testToOrdering.count}</div>
                <div className="text-gray-600">TestAgent Responses</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Response Time Analysis Cards */}
      {processedTranscript.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm">
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
          </div> */}
{/* 
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
          </div> */}
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
                <div className={`flex ${message.speaker === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                    message.speaker === 'agent' 
                      ? 'bg-blue-500 text-white rounded-br-md' 
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                  }`}>
                    {/* Speaker info */}
                    <div className={`text-xs font-medium mb-1 ${
                      message.speaker === 'agent' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <div className="flex items-center">
                        {message.speaker === 'user' ? (
                          <PhoneIcon className="h-3 w-3 mr-1" />
                        ) : (
                          <ComputerDesktopIcon className="h-3 w-3 mr-1" />
                        )}
                        {message.speaker === 'user' ? 'Restaurant AI' : 'Testing Agent' }
                        {/* Display start_time if available, otherwise timestamp */}
                        <span className="ml-2 opacity-75">
                          {message.start_time ? formatTimestamp(message.start_time) : formatTimestamp(message.timestamp)}
                        </span>
                        {/* Show timing source indicator */}
                        <span className="ml-1 text-xs opacity-50">
                          {message.start_time ? '(start)' : '(end)'}
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