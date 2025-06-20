import React, { useState, useEffect, useRef } from 'react';
import { useTranscriptStream } from './utils';

const TranscriptViewer = ({ testId, organizationId, transcript = [] }) => {
  const {
    messages: realtimeMessages,
    connectionStatus,
    callStatus,
    isConnected,
    audioChunks,
    isAudioEnabled,
    enableAudio,
    disableAudio
  } = useTranscriptStream(testId, organizationId);
  
  const messagesEndRef = useRef(null);
  const [displayMessages, setDisplayMessages] = useState([]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  // Combine real-time messages with fallback transcript
  useEffect(() => {
    if (realtimeMessages && realtimeMessages.length > 0) {
      // Use real-time messages when available
      setDisplayMessages(realtimeMessages);
    } else if (transcript && transcript.length > 0) {
      // Fallback to prop transcript
      setDisplayMessages(transcript);
    } else {
      setDisplayMessages([]);
    }
  }, [realtimeMessages, transcript]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  const getMessageTypeStyle = (type) => {
    switch (type) {
      case 'user_speech':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'assistant_response':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'call_started':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'call_ended':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getCallStatusColor = () => {
    switch (callStatus) {
      case 'started':
        return 'text-green-600';
      case 'ended':
        return 'text-gray-600';
      case 'idle':
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Real-time Transcript</h3>
        
        <div className="flex items-center space-x-4">
          {/* Audio Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={isAudioEnabled ? disableAudio : enableAudio}
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isAudioEnabled 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={isAudioEnabled ? 'Disable real-time audio' : 'Enable real-time audio (requires user interaction)'}
            >
              <span className="text-lg">
                {isAudioEnabled ? '🔊' : '🔇'}
              </span>
              <span>
                {isAudioEnabled ? 'Audio On' : 'Audio Off'}
              </span>
            </button>
            
            {/* Audio Activity Indicator */}
            {isAudioEnabled && audioChunks.length > 0 && (
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-4 bg-green-400 rounded-full animate-pulse`}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    ></div>
                  ))}
                </div>
                <span className="text-xs text-green-600 font-medium">
                  Live Audio ({audioChunks.filter(chunk => chunk.speaker === 'user').length} user, {audioChunks.filter(chunk => chunk.speaker === 'assistant').length} assistant)
                </span>
              </div>
            )}
            
            {audioChunks.length > 0 && !isAudioEnabled && (
              <span className="text-xs text-orange-600 font-medium">
                {audioChunks.length} chunks available - Click Audio On to listen
              </span>
            )}
            
            {!isConnected && (
              <span className="text-xs text-red-600">
                Audio requires live connection
              </span>
            )}
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={getConnectionStatusColor()}>
                {connectionStatus === 'connected' && 'Live'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'disconnected' && 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Call:</span>
              <span className={getCallStatusColor()}>
                {callStatus === 'started' && 'Active'}
                {callStatus === 'ended' && 'Ended'}
                {callStatus === 'idle' && 'Idle'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-96 overflow-y-auto">
        {displayMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">💬</div>
            <p>Waiting for conversation to start...</p>
            {isConnected && (
              <p className="text-sm mt-2">Real-time connection established</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayMessages.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getMessageTypeStyle(message.type)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {message.type === 'user_speech' && '👤 User'}
                      {message.type === 'assistant_response' && '🤖 Assistant'}
                      {message.type === 'call_started' && '📞 System'}
                      {message.type === 'call_ended' && '📞 System'}
                      {!message.type && (message.speaker === 'user' ? '👤 User' : message.speaker === 'agent' ? '🤖 Assistant' : '📞 System')}
                    </span>
                    {message.type === 'user_speech' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Speech
                      </span>
                    )}
                    {message.type === 'assistant_response' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Response
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                <p className="text-gray-800 leading-relaxed">
                  {message.text || message.message || 'No content'}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Connection Info */}
      {connectionStatus === 'disconnected' && displayMessages.length === 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            ⚠️ Real-time connection not available. Showing fallback transcript data.
          </p>
        </div>
      )}

      {/* Message Count */}
      {displayMessages.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          {displayMessages.length} message{displayMessages.length !== 1 ? 's' : ''}
          {isConnected && ' • Live updates enabled'}
        </div>
      )}
    </div>
  );
};

export default TranscriptViewer; 