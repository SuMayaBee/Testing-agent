import React, { useState, useEffect } from 'react';
import { ClockIcon, UserCircleIcon, ChatBubbleLeftRightIcon, ArrowLongDownIcon } from '@heroicons/react/24/outline';

const TimelineVisualization = ({ transcript, maxHeight = 400 }) => {
  const [sortedMessages, setSortedMessages] = useState([]);
  const [responseMetrics, setResponseMetrics] = useState({
    phonelineResponseTime: 0,
    testingResponseTime: 0,
    phonelineResponseCount: 0,
    testingResponseCount: 0,
    totalConversationTime: 0
  });

  // Process transcript into chronologically sorted messages
  useEffect(() => {
    if (!transcript || transcript.length === 0) return;

    // Extract timestamps and convert to Date objects
    const messages = transcript.map(msg => {
      let timestamp = null;
      
      if (msg.timestamp) {
        // Handle different timestamp formats
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
      
      return {
        ...msg,
        timestamp,
        timestampMs: timestamp ? timestamp.getTime() : null
      };
    }).filter(msg => msg.timestamp !== null && msg.timestampMs);
    
    if (messages.length === 0) return;
    
    // Sort all messages by timestamp ascending
    const sortedByTime = [...messages].sort((a, b) => a.timestampMs - b.timestampMs);
    
    // Filter out system messages - only use agent messages
    const agentMessages = sortedByTime.filter(msg => msg.speaker === 'user' || msg.speaker === 'agent');
    
    if (agentMessages.length === 0) return;
    
    // Calculate response times using only agent messages
    calculateResponseTimes(agentMessages);
    
    // Add response time and conversation group to each message
    const messagesWithMetrics = addMetricsAndGroups(agentMessages);
    
    setSortedMessages(messagesWithMetrics);
  }, [transcript]);

  // Calculate how long each agent takes to respond - using only agent messages
  const calculateResponseTimes = (messages) => {
    if (!messages || messages.length <= 1) {
      setResponseMetrics({
        phonelineResponseTime: 0,
        testingResponseTime: 0,
        phonelineResponseCount: 0,
        testingResponseCount: 0,
        totalConversationTime: 0
      });
      return;
    }

    let phonelineResponseTime = 0;
    let testingResponseTime = 0;
    let phonelineResponseCount = 0;
    let testingResponseCount = 0;
    
    // Calculate total conversation time from first to last agent message
    const startTime = messages[0].timestampMs;
    const endTime = messages[messages.length - 1].timestampMs;
    const totalConversationTime = endTime - startTime;
    
    // For each message, calculate response times
    for (let i = 0; i < messages.length - 1; i++) {
      const currentMsg = messages[i];
      const nextMsg = messages[i + 1];
      
      // Only calculate response time for actual conversation turns (different speakers)
      if (currentMsg.speaker !== nextMsg.speaker) {
        const responseTime = nextMsg.timestampMs - currentMsg.timestampMs;
        
        // Attribute the response time to the responder (who is responding)
        if (nextMsg.speaker === 'user') {
          phonelineResponseTime += responseTime;
          phonelineResponseCount++;
        } else if (nextMsg.speaker === 'agent') {
          testingResponseTime += responseTime;
          testingResponseCount++;
        }
      }
    }
    
    setResponseMetrics({
      phonelineResponseTime,
      testingResponseTime,
      phonelineResponseCount,
      testingResponseCount,
      totalConversationTime
    });
  };

  // Add metrics and identify conversation groups
  const addMetricsAndGroups = (messages) => {
    if (!messages || messages.length <= 1) return messages;
    
    let groupId = 0;
    const messagesWithMetrics = [];
    
    for (let i = 0; i < messages.length; i++) {
      const currentMsg = messages[i];
      let responseTime = null;
      let isGroupStart = false;
      let isInGroup = false;
      let groupPosition = 0; // 0 = not in group, 1 = first, 2 = middle, 3 = last
      
      // Calculate response time
      if (i < messages.length - 1) {
        const nextMsg = messages[i + 1];
        // Only calculate response time for actual conversation turns (different speakers)
        if (currentMsg.speaker !== nextMsg.speaker) {
          responseTime = nextMsg.timestampMs - currentMsg.timestampMs;
        }
        // If same speaker continues, responseTime remains null
      }
      
      // Group related messages (A → B → A pattern)
      if (i < messages.length - 2) {
        const nextMsg = messages[i + 1];
        const followingMsg = messages[i + 2];
        
        // Check if this forms a group (A → B → A)
        if (currentMsg.speaker !== nextMsg.speaker && followingMsg.speaker === currentMsg.speaker) {
          isGroupStart = true;
          isInGroup = true;
          groupPosition = 1;
          groupId++;
        } 
      }
      
      // Check if this message is the middle part of a group
      if (i > 0 && i < messages.length - 1) {
        const prevMsg = messages[i - 1];
        const nextMsg = messages[i + 1];
        
        if (prevMsg.speaker !== currentMsg.speaker && nextMsg.speaker === prevMsg.speaker) {
          isInGroup = true;
          groupPosition = 2;
        }
      }
      
      // Check if this message completes a group
      if (i >= 2) {
        const prevPrevMsg = messages[i - 2];
        const prevMsg = messages[i - 1];
        
        if (prevPrevMsg.speaker === currentMsg.speaker && prevMsg.speaker !== currentMsg.speaker) {
          isInGroup = true;
          groupPosition = 3;
        }
      }
      
      // Get response time speed category
      const responseSpeed = getResponseSpeedCategory(responseTime);
      
      messagesWithMetrics.push({
        ...currentMsg,
        responseTime,
        isGroupStart,
        isInGroup,
        groupPosition,
        groupId: isInGroup ? groupId : null,
        responseSpeed
      });
    }
    
    return messagesWithMetrics;
  };
  
  // Categorize response speed as fast, medium, or slow
  const getResponseSpeedCategory = (responseTime) => {
    if (!responseTime) return null;
    
    // Convert to milliseconds (no division needed now)
    const ms = responseTime;
    
    if (ms < 5000) return 'fast';
    if (ms < 20000) return 'medium';
    return 'slow';
  };

  // Format timestamp for display with AM/PM
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };
  
  // Format duration in milliseconds, seconds, minutes, or hours
  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    
    // If less than 1 second, show milliseconds
    if (ms < 1000) return `${ms}ms`;
    
    const seconds = Math.floor(ms / 1000);
    const remainingMs = ms % 1000;
    
    if (seconds < 60) return `${seconds}s ${remainingMs}ms`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s ${remainingMs}ms`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s ${remainingMs}ms`;
  };

  // Get speaker icon
  const getSpeakerIcon = (speaker) => {
    if (speaker === 'user') {
      return <UserCircleIcon className="h-5 w-5 text-secondary-600" />;
    } else if (speaker === 'agent') {
      return <ChatBubbleLeftRightIcon className="h-5 w-5 text-primary-600" />;
    } else {
      return <ClockIcon className="h-5 w-5 text-secondary-400" />;
    }
  };

  // Get speaker name
  const getSpeakerName = (speaker) => {
    if (speaker === 'user') return 'Phoneline Agent (Restaurant AI)';
    if (speaker === 'agent') return 'Testing Agent (OpenAI)';
    return 'System';
  };

  // Get message background color class
  const getMessageBgClass = (speaker, isInGroup, groupPosition) => {
    let baseClass = '';
    
    if (speaker === 'user') {
      baseClass = 'bg-white border border-secondary-200';
    } else if (speaker === 'agent') {
      baseClass = 'bg-primary-100';
    } else {
      baseClass = 'bg-secondary-100';
    }
    
    // Add group styling without mentioning cycles
    if (isInGroup) {
      if (groupPosition === 1) {
        return `${baseClass} border-l-4 border-l-purple-400 border-t-4 border-t-purple-400 border-r-4 border-r-purple-400`;
      } else if (groupPosition === 3) {
        return `${baseClass} border-l-4 border-l-purple-400 border-b-4 border-b-purple-400 border-r-4 border-r-purple-400`;
      } else {
        return `${baseClass} border-l-4 border-l-purple-400 border-r-4 border-r-purple-400`;
      }
    }
    
    return baseClass;
  };

  // Get time label color class  
  const getTimeClass = (speaker) => {
    if (speaker === 'user') return 'text-secondary-600';
    if (speaker === 'agent') return 'text-primary-700';
    return 'text-secondary-500';
  };
  
  // Get color for response time indicator
  const getResponseTimeColor = (speed) => {
    if (!speed) return 'bg-gray-200';
    if (speed === 'fast') return 'bg-green-500';
    if (speed === 'medium') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Calculate average response times
  const getAverageResponseTime = (totalTime, count) => {
    if (!count || count === 0) return 0;
    return totalTime / count;
  };

  // Find the first agent message
  const getFirstAgentMessage = () => {
    if (!sortedMessages || sortedMessages.length === 0) return null;
    return sortedMessages.length > 0 ? sortedMessages[0] : null;
  };
  
  // Find the last agent message
  const getLastAgentMessage = () => {
    if (!sortedMessages || sortedMessages.length === 0) return null;
    return sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1] : null;
  };

  if (!sortedMessages || sortedMessages.length === 0) {
    return (
      <div className="bg-secondary-50 p-4 rounded text-sm text-secondary-500">
        No timeline data available. Timeline will display when messages with timestamps are available.
      </div>
    );
  }

  // Get first and last agent messages
  const firstAgentMessage = getFirstAgentMessage();
  const lastAgentMessage = getLastAgentMessage();

  return (
    <div className="mb-6">
      <h3 className="font-medium flex items-center mb-3">
        <ClockIcon className="w-5 h-5 mr-1" />
        Response Time Analysis
      </h3>
      
      <div className="bg-secondary-50 p-4 rounded-md mb-4">
        {/* Response time metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-3 rounded-md border border-secondary-200">
            <div className="flex items-center mb-2">
              <UserCircleIcon className="h-5 w-5 text-secondary-600 mr-2" />
              <h4 className="font-medium">Phoneline Agent (Restaurant AI)</h4>
            </div>
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span>Average Response Time:</span>
                <span className="font-medium">
                  {formatDuration(getAverageResponseTime(
                    responseMetrics.phonelineResponseTime,
                    responseMetrics.phonelineResponseCount
                  ))}
                </span>
              </div>
              <div className="flex justify-between text-xs text-secondary-500">
                <span>Total Response Time:</span>
                <span>{formatDuration(responseMetrics.phonelineResponseTime)}</span>
              </div>
              <div className="flex justify-between text-xs text-secondary-500">
                <span>Response Count:</span>
                <span>{responseMetrics.phonelineResponseCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-md border border-secondary-200">
            <div className="flex items-center mb-2">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-primary-600 mr-2" />
              <h4 className="font-medium">Testing Agent (OpenAI)</h4>
            </div>
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span>Average Response Time:</span>
                <span className="font-medium">
                  {formatDuration(getAverageResponseTime(
                    responseMetrics.testingResponseTime,
                    responseMetrics.testingResponseCount
                  ))}
                </span>
              </div>
              <div className="flex justify-between text-xs text-secondary-500">
                <span>Total Response Time:</span>
                <span>{formatDuration(responseMetrics.testingResponseTime)}</span>
              </div>
              <div className="flex justify-between text-xs text-secondary-500">
                <span>Response Count:</span>
                <span>{responseMetrics.testingResponseCount}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Total time and timestamp range */}
        <div className="flex justify-between items-center text-xs text-secondary-600 font-medium">
          <div>Total Time: {formatDuration(responseMetrics.totalConversationTime)}</div>
          <div className="flex gap-4">
            <div>Start: {firstAgentMessage ? formatTime(firstAgentMessage.timestamp) : 'N/A'} 
              <span className="ml-1 text-secondary-400">
                ({getSpeakerName(firstAgentMessage?.speaker)})
              </span>
            </div>
            <div>End: {lastAgentMessage ? formatTime(lastAgentMessage.timestamp) : 'N/A'}
              <span className="ml-1 text-secondary-400">
                ({getSpeakerName(lastAgentMessage?.speaker)})
              </span>
            </div>
          </div>
        </div>
        
        {/* Response time legend */}
        <div className="flex items-center mt-3 text-xs gap-4">
          <div className="font-medium">Response Speed:</div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span>Fast (&lt;5000ms)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
            <span>Medium (5000-20000ms)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
            <span>Slow (&gt;20000ms)</span>
          </div>
          <div className="flex items-center ml-4">
            <div className="w-3 h-8 border-l-4 border-purple-400 mr-1"></div>
            <span>Conversation Group</span>
          </div>
        </div>
      </div>
      
      <h3 className="font-medium mb-3">Chronological Transcript</h3>
      
      <div className="bg-secondary-50 p-4 rounded-md overflow-y-auto" style={{ maxHeight: `${maxHeight}px` }}>
        {/* Timeline line connecting all events */}
        <div className="relative pl-8 border-l-2 border-secondary-200">
          {sortedMessages.map((message, index) => (
            <div key={index} className="relative">
              {/* Timestamp marker with response time indicator */}
              <div className="absolute -left-10 mt-0.5 flex items-center">
                <div className={`p-1 rounded-full ${message.speaker === 'user' ? 'bg-secondary-100' : 'bg-primary-100'}`}>
                  {getSpeakerIcon(message.speaker)}
                </div>
                
                {/* Response time indicator dot */}
                {message.responseTime && message.respondingAgent && message.respondingAgent !== message.speaker && (
                  <div className={`absolute -right-1 -top-1 w-3 h-3 rounded-full ${getResponseTimeColor(message.responseSpeed)} border border-white`} 
                       title={`Response time: ${formatDuration(message.responseTime)}`}></div>
                )}
              </div>
              
              {/* Response time visualization - arrow with time */}
              {message.responseTime && message.respondingAgent && message.respondingAgent !== message.speaker && (
                <div className="absolute -left-6 top-6 bottom-0 flex flex-col items-center text-xs"
                     style={{ height: message.responseSpeed === 'slow' ? '80px' : message.responseSpeed === 'medium' ? '50px' : '30px' }}>
                  <div className={`h-full w-0.5 ${getResponseTimeColor(message.responseSpeed)}`}></div>
                  <ArrowLongDownIcon className={`h-4 w-4 ${message.responseSpeed === 'fast' ? 'text-green-500' : message.responseSpeed === 'medium' ? 'text-yellow-500' : 'text-red-500'}`} />
                  <div className={`px-1 rounded-sm text-white text-[10px] ${message.responseSpeed === 'fast' ? 'bg-green-500' : message.responseSpeed === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                    {formatDuration(message.responseTime)}
                  </div>
                </div>
              )}
              
              {/* Message block */}
              <div className={`mb-${message.responseTime ? '16' : '4'}`}>
                {/* Timestamp */}
                <div className={`text-xs font-semibold mb-1 ${getTimeClass(message.speaker)}`}>
                  {formatTime(message.timestamp)} - {getSpeakerName(message.speaker)}
                </div>
                
                {/* Message content */}
                <div className={`p-3 rounded-md ${getMessageBgClass(message.speaker, message.isInGroup, message.groupPosition)}`}>
                  <p className="text-sm">{message.text}</p>
                </div>
                
                {/* Session ID if available */}
                {message.session_id && (
                  <div className="mt-1 text-xs text-secondary-400">
                    Session ID: {message.session_id}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimelineVisualization; 