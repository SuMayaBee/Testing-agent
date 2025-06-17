import React, { useRef, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

function TranscriptViewer({ transcript }) {
  const transcriptContainerRef = useRef(null);
  const prevTranscriptLengthRef = useRef(0);
  const prevLastSpeakerRef = useRef(null);

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      let date;
      
      // Handle different timestamp formats
      if (typeof timestamp === 'string') {
        // Try parsing as ISO string first
        date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          // If that fails, try parsing as a number
          const numTimestamp = parseFloat(timestamp);
          if (!isNaN(numTimestamp)) {
            date = new Date(numTimestamp);
          }
        }
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        // Firestore timestamp format
        date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      } else {
        return '';
      }
      
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error, timestamp);
      return '';
    }
  };

  // Process transcript for display (simplified version without response time calculations)
  const processTranscriptForDisplay = (transcriptData) => {
    if (!transcriptData || !Array.isArray(transcriptData)) {
      return [];
    }

    return transcriptData.map((message, index) => ({
      ...message,
      index
    }));
  };

  const processedTranscript = processTranscriptForDisplay(transcript);

  // Auto-scroll functionality
  useEffect(() => {
    const currentTranscriptLength = transcript.length;
    const lastMessage = transcript[transcript.length - 1];
    const currentLastSpeaker = lastMessage?.speaker;
    
    // Determine if we should scroll
    let shouldScroll = false;
    
    if (currentTranscriptLength > prevTranscriptLengthRef.current) {
      // New messages added
      shouldScroll = true;
    } else if (currentTranscriptLength === prevTranscriptLengthRef.current && 
               currentLastSpeaker !== prevLastSpeakerRef.current) {
      // Same number of messages but last speaker changed (message updated)
      shouldScroll = true;
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
  }, [transcript]);

  return (
    <div className="mb-6">
      <h3 className="font-medium flex items-center mb-4">
        <DocumentTextIcon className="w-5 h-5 mr-2" />
        Live Conversation
      </h3>

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
    </div>
  );
}

export default TranscriptViewer; 