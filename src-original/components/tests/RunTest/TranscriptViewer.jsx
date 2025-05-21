import React, { useEffect, useRef } from 'react';
import { 
  DocumentTextIcon, 
  ClockIcon, 
  UserCircleIcon, 
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline';

function TranscriptViewer({ transcript }) {
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

  console.log("TranscriptViewer component - Transcript:", transcript);
  
  // Group consecutive messages from the same speaker
  const groupMessages = (transcriptData) => {
    const groupedMessages = [];
    let currentGroup = null;
    
    transcriptData.forEach((line, index) => {
      // Ensure speaker information is consistent
      const speaker = line.speaker || 
                     (line.agent === 'OrderingAgent' ? 'user' : 
                      line.agent === 'TestAgent' ? 'agent' : 
                      'system');
      
      const messageText = line.text || line.message || '';
      
      // Skip empty messages
      if (!messageText.trim()) return;
      
      // Skip system messages from grouping
      if (speaker === 'system') {
        // If we have a current group, push it before the system message
        if (currentGroup) {
          groupedMessages.push(currentGroup);
          currentGroup = null;
        }
        // Push system message as a standalone item
        groupedMessages.push({ type: 'system', messages: [{ ...line, speaker, text: messageText }] });
        return;
      }
      
      // If no current group or different speaker, start a new group
      if (!currentGroup || currentGroup.speaker !== speaker) {
        // Add the previous group if it exists
        if (currentGroup) {
          groupedMessages.push(currentGroup);
        }
        
        // Start a new group
        currentGroup = {
          type: 'message',
          speaker,
          messages: [{ ...line, speaker, text: messageText }],
          timestamp: line.timestamp // Keep track of the first message's timestamp
        };
      } else {
        // Add to current group
        currentGroup.messages.push({ ...line, speaker, text: messageText });
        // Update timestamp to the latest message
        if (line.timestamp) {
          currentGroup.timestamp = line.timestamp;
        }
      }
    });
    
    // Add the last group if it exists
    if (currentGroup) {
      groupedMessages.push(currentGroup);
    }
    
    return groupedMessages;
  };
  
  const groupedTranscript = groupMessages(transcript);

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
      <h3 className="font-medium flex items-center mb-3">
        <DocumentTextIcon className="w-5 h-5 mr-1" />
        Call Transcript
      </h3>
      
      <div 
        ref={transcriptContainerRef}
        className="bg-secondary-50 p-4 rounded-md whitespace-pre-wrap text-sm max-h-80 overflow-y-auto"
      >
        {transcript.length > 0 ? (
          <div className="space-y-4">
            {/* Legend to identify participants */}
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-secondary-200">
              <div className="flex items-center">
                <div className="bg-secondary-100 rounded-full p-1.5 mr-2">
                  <UserCircleIcon className="h-4 w-4 text-secondary-600" />
                </div>
                <span className="text-xs font-medium">Phoneline Agent</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs font-medium">Testing Agent</span>
                <div className="bg-primary-100 rounded-full p-1.5 ml-2">
                  <ChatBubbleLeftRightIcon className="h-4 w-4 text-primary-600" />
                </div>
              </div>
            </div>

            {groupedTranscript.map((group, groupIndex) => {
              // Render system messages
              if (group.type === 'system') {
                const line = group.messages[0];
                return (
                  <div key={`system-${groupIndex}`} className="my-4 flex justify-center">
                    <div className="inline-block bg-secondary-100 rounded-md px-3 py-2 text-xs text-secondary-600 max-w-xs">
                      {line.text}
                    </div>
                  </div>
                );
              }
              
              // Render Testing Agent messages (right side)
              if (group.speaker === 'agent') {
                return (
                  <div key={`agent-${groupIndex}`} className="mb-4 flex justify-end">
                    <div className="max-w-[75%]">
                      <div className="flex items-center justify-end mb-1">
                        <span className="text-xs text-primary-600 mr-2">Testing Agent</span>
                        <div className="bg-primary-100 rounded-full p-1.5 flex-shrink-0">
                          <ChatBubbleLeftRightIcon className="h-4 w-4 text-primary-600" />
                        </div>
                      </div>
                      <div className="bg-primary-100 rounded-lg p-3">
                        {group.messages.map((msg, msgIndex) => (
                          <div key={`msg-${groupIndex}-${msgIndex}`} className={msgIndex > 0 ? 'mt-2' : ''}>
                            <p>{msg.text}</p>
                          </div>
                        ))}
                      </div>
                      {group.timestamp && (
                        <div className="text-right mt-1">
                          <span className="text-xs text-secondary-400 flex items-center justify-end">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            {formatTimestamp(group.timestamp)}
                          </span>
                        </div>
                      )}
                      {group.messages[0].session_id && (
                        <div className="text-right mt-1 text-xs text-secondary-400">
                          Session ID: {group.messages[0].session_id}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              
              // Render Phoneline Agent messages (left side) - handle both 'user' speaker
              return (
                <div key={`user-${groupIndex}`} className="mb-4 flex justify-start">
                  <div className="max-w-[75%]">
                    <div className="flex items-center mb-1">
                      <div className="bg-secondary-100 rounded-full p-1.5 mr-2 flex-shrink-0">
                        <UserCircleIcon className="h-4 w-4 text-secondary-600" />
                      </div>
                      <span className="text-xs text-secondary-600">Phoneline Agent</span>
                    </div>
                    <div className="bg-white border border-secondary-200 rounded-lg p-3 ml-7">
                      {group.messages.map((msg, msgIndex) => (
                        <div key={`msg-${groupIndex}-${msgIndex}`} className={msgIndex > 0 ? 'mt-2 pt-2 border-t border-secondary-100' : ''}>
                          <p>{msg.text}</p>
                        </div>
                      ))}
                    </div>
                    {group.timestamp && (
                      <div className="ml-7 mt-1">
                        <span className="text-xs text-secondary-400 flex items-center">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          {formatTimestamp(group.timestamp)}
                        </span>
                      </div>
                    )}
                    {group.messages[0].session_id && (
                      <div className="ml-7 mt-1 text-xs text-secondary-400">
                        Session ID: {group.messages[0].session_id}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-secondary-500 italic">Transcript will appear here as the test runs...</p>
        )}
      </div>
    </div>
  );
}

export default TranscriptViewer; 