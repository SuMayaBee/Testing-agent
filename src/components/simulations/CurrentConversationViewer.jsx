import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { voiceAgentAPI } from '../../lib/api';
import { 
  DocumentTextIcon, 
  ClockIcon, 
  UserCircleIcon, 
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

function CurrentConversationViewer({ testId, testName }) {
  const { currentOrganizationUsername } = useApp();
  const [currentConversation, setCurrentConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const transcriptContainerRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Function to format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    // Handle Firebase timestamp
    if (timestamp.seconds) {
      timestamp = new Date(timestamp.seconds * 1000);
    } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      timestamp = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      timestamp = new Date(timestamp);
    }
    
    if (!(timestamp instanceof Date) || isNaN(timestamp)) {
      return '';
    }
    
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Function to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    // Handle Firebase timestamp
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString();
    } else {
      try {
        return new Date(timestamp).toLocaleString();
      } catch (e) {
        return 'Invalid Date';
      }
    }
  };

  // Group consecutive messages from the same speaker
  const groupMessages = (messages) => {
    if (!messages || !Array.isArray(messages)) return [];
    
    const groupedMessages = [];
    let currentGroup = null;
    
    messages.forEach((message, index) => {
      const speaker = message.agent === 'TestAgent' ? 'agent' : 'user';
      const messageText = message.message || '';
      
      // Skip empty messages
      if (!messageText.trim()) return;
      
      // If no current group or different speaker, start a new group
      if (!currentGroup || currentGroup.speaker !== speaker) {
        // Add the previous group if it exists
        if (currentGroup) {
          groupedMessages.push(currentGroup);
        }
        
        // Start a new group
        currentGroup = {
          speaker,
          messages: [message],
          timestamp: message.timestamp
        };
      } else {
        // Add to current group
        currentGroup.messages.push(message);
        // Update timestamp to the latest message
        if (message.timestamp) {
          currentGroup.timestamp = message.timestamp;
        }
      }
    });
    
    // Add the last group if it exists
    if (currentGroup) {
      groupedMessages.push(currentGroup);
    }
    
    return groupedMessages;
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (transcriptContainerRef.current && currentConversation?.messages) {
      const container = transcriptContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [currentConversation?.messages]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentOrganizationUsername || !testId) return;

    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = voiceAgentAPI.subscribeToCurrentConversation(
      currentOrganizationUsername,
      testId,
      (result) => {
        setLoading(false);
        
        if (result.success) {
          setCurrentConversation(result.data);
          setIsLive(result.data?.call_status === 'in_progress');
          setError(null);
        } else {
          setError(result.error);
          setCurrentConversation(null);
          setIsLive(false);
        }
      }
    );

    if (unsubscribe) {
      unsubscribeRef.current = unsubscribe;
    } else {
      setLoading(false);
      setError('Failed to set up real-time subscription');
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentOrganizationUsername, testId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6">
        <div className="text-center text-secondary-500">
          <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 text-secondary-400" />
          <p>No active conversation</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentConversation) {
    return (
      <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6">
        <div className="text-center text-secondary-500">
          <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 text-secondary-400" />
          <p>No current conversation found</p>
          <p className="text-sm mt-1">Start a test to see real-time conversation</p>
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessages(currentConversation.messages || []);

  return (
    <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center">
          <DocumentTextIcon className="w-5 h-5 mr-2" />
          Current Conversation - {testName}
          {isLive && (
            <span className="ml-2 flex items-center text-green-600 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              Live
            </span>
          )}
        </h3>
        
        {currentConversation.call_status && (
          <span className={`px-2 py-1 text-xs rounded-full ${
            currentConversation.call_status === 'in_progress' 
              ? 'bg-blue-100 text-blue-800' 
              : currentConversation.call_status === 'completed'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {currentConversation.call_status}
          </span>
        )}
      </div>

      {/* Call Info */}
      <div className="mb-4 text-sm text-secondary-600 space-y-1">
        {currentConversation.target_phone_number && (
          <div className="flex items-center">
            <PhoneIcon className="w-4 h-4 mr-1" />
            Target: {currentConversation.target_phone_number}
          </div>
        )}
        {currentConversation.call_sid && (
          <div className="flex items-center">
            <SignalIcon className="w-4 h-4 mr-1" />
            Call SID: {currentConversation.call_sid}
          </div>
        )}
        {currentConversation.created_at && (
          <div className="flex items-center">
            <ClockIcon className="w-4 h-4 mr-1" />
            Started: {formatDate(currentConversation.created_at)}
          </div>
        )}
      </div>

      {/* Transcript */}
      <div 
        ref={transcriptContainerRef}
        className="bg-secondary-50 p-4 rounded-md max-h-96 overflow-y-auto"
      >
        {groupedMessages.length > 0 ? (
          <div className="space-y-4">
            {/* Legend */}
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

            {groupedMessages.map((group, groupIndex) => {
              // Testing Agent messages (right side)
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
                            <p>{msg.message}</p>
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
                    </div>
                  </div>
                );
              }
              
              // Phoneline Agent messages (left side)
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
                          <p>{msg.message}</p>
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
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-secondary-500 italic text-center">
            {isLive ? 'Waiting for conversation to begin...' : 'No messages in this conversation'}
          </p>
        )}
      </div>
    </div>
  );
}

export default CurrentConversationViewer;