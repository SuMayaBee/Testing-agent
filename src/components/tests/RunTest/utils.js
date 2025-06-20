import { useState, useEffect, useRef, useCallback } from 'react';
import { voiceAgentAPI, callAnalyticsAPI } from '../../../lib/api';
import { normalizeScore, STATUSES } from './constants';
import { firebaseTranscriptService } from './firebaseTranscriptService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase-config';

/**
 * Real-time transcript WebSocket manager
 * Connects to the backend WebSocket for live transcript streaming without database overhead
 */
export class TranscriptWebSocketManager {
  constructor(testId, onMessage, onError = null, onConnect = null, onDisconnect = null) {
    this.testId = testId;
    this.onMessage = onMessage;
    this.onError = onError;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.isConnecting = false;
    this.shouldReconnect = true;
    this.pingInterval = null;
    this.pongTimeout = null;
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    
    try {
      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Simple host determination - use localhost:8000 for development
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
      
      const wsUrl = `${protocol}//${host}/api/voice-agent/transcript-stream/${this.testId}`;
      
      console.log(`📡 Connecting to WebSocket: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('📡 WebSocket connected for transcript streaming');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        
        // Start ping/pong keepalive
        this.startPingPong();
        
        if (this.onConnect) {
          this.onConnect();
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong responses
          if (data.type === 'pong') {
            if (this.pongTimeout) {
              clearTimeout(this.pongTimeout);
              this.pongTimeout = null;
            }
            return;
          }
          
          console.log('📡 Received WebSocket message:', data);
          
          if (this.onMessage) {
            this.onMessage(data);
          }
        } catch (error) {
          console.error('📡 Error parsing WebSocket message:', error, event.data);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('📡 WebSocket connection closed:', event.code, event.reason);
        this.isConnecting = false;
        this.stopPingPong();
        
        if (this.onDisconnect) {
          this.onDisconnect();
        }
        
        // Attempt to reconnect if it wasn't a clean close and we should reconnect
        if (this.shouldReconnect && event.code !== 1000) {
          this.attemptReconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('📡 WebSocket error:', error);
        this.isConnecting = false;
        
        if (this.onError) {
          this.onError(error);
        }
      };
      
    } catch (error) {
      console.error('📡 Error creating WebSocket connection:', error);
      this.isConnecting = false;
      
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  startPingPong() {
    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        
        // Set timeout to detect if pong is not received
        this.pongTimeout = setTimeout(() => {
          console.warn('📡 Pong not received, connection may be dead');
          this.ws.close();
        }, 5000);
      }
    }, 30000);
  }

  stopPingPong() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('📡 Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`📡 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms`);
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, this.reconnectDelay);
    
    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopPingPong();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * React hook for managing real-time transcript streaming
 * @param {string} testId - The test ID to stream transcripts for
 * @param {string} organizationId - The organization ID (for validation)
 * @returns {Object} - Transcript streaming state and controls
 */
export const useTranscriptStream = (testId, organizationId) => {
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [callStatus, setCallStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  
  const wsManagerRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioBufferQueueRef = useRef([]);
  const isConnected = connectionStatus === 'connected';

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((data) => {
    console.log('📡 Processing WebSocket message:', data);
    
    switch (data.type) {
      case 'user_speech':
        setMessages(prev => [...prev, {
          type: 'user_speech',
          text: data.transcript,
          timestamp: data.timestamp || new Date().toISOString(),
          speaker: 'user'
        }]);
        break;
        
      case 'assistant_response':
        setMessages(prev => [...prev, {
          type: 'assistant_response', 
          text: data.transcript,
          timestamp: data.timestamp || new Date().toISOString(),
          speaker: 'agent'
        }]);
        break;
        
      case 'audio_chunk':
        // Handle real-time audio streaming
        if (isAudioEnabled && data.audio_data) {
          handleAudioChunk(data);
        }
        setAudioChunks(prev => [...prev.slice(-50), data]); // Keep last 50 chunks
        break;
        
      case 'call_started':
        setCallStatus('started');
        setMessages(prev => [...prev, {
          type: 'call_started',
          text: 'Call started',
          timestamp: data.timestamp || new Date().toISOString(),
          speaker: 'system'
        }]);
        break;
        
      case 'call_ended':
        setCallStatus('ended');
        setMessages(prev => [...prev, {
          type: 'call_ended',
          text: 'Call ended',
          timestamp: data.timestamp || new Date().toISOString(),
          speaker: 'system'
        }]);
        break;
        
      default:
        console.log('📡 Unknown message type:', data.type);
        // Handle generic messages
        setMessages(prev => [...prev, {
          type: 'message',
          text: data.message || data.transcript || 'Unknown message',
          timestamp: data.timestamp || new Date().toISOString(),
          speaker: data.speaker || 'system'
        }]);
    }
  }, []);

  // Handle connection events
  const handleConnect = useCallback(() => {
    setConnectionStatus('connected');
    setError(null);
    console.log('📡 Real-time transcript connection established');
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnectionStatus('disconnected');
    console.log('📡 Real-time transcript connection lost');
  }, []);

  const handleError = useCallback((error) => {
    setError(error);
    setConnectionStatus('disconnected');
    console.error('📡 Real-time transcript connection error:', error);
  }, []);

  // Initialize WebSocket connection when testId changes
  useEffect(() => {
    if (!testId || !organizationId) {
      console.log('📡 No testId or organizationId provided, skipping WebSocket connection');
      return;
    }

    console.log(`📡 Setting up real-time transcript stream for test: ${testId}`);
    
    // Clean up existing connection
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
    }

    // Create new WebSocket manager
    wsManagerRef.current = new TranscriptWebSocketManager(
      testId,
      handleMessage,
      handleError,
      handleConnect,
      handleDisconnect
    );

    setConnectionStatus('connecting');
    wsManagerRef.current.connect();

    // Cleanup function
    return () => {
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
        wsManagerRef.current = null;
      }
      setConnectionStatus('disconnected');
    };
  }, [testId, organizationId, handleMessage, handleError, handleConnect, handleDisconnect]);

  // Clear messages when testId changes
  useEffect(() => {
    setMessages([]);
    setCallStatus('idle');
    setError(null);
  }, [testId]);

  // Audio processing functions
  const initializeAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 8000 // Twilio uses 8kHz for phone calls, not 16kHz
        });
        
        // Resume audio context if it's suspended (required by Chrome)
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        
        console.log('🔊 Audio context initialized for real-time streaming');
      } catch (error) {
        console.error('🔊 Error initializing audio context:', error);
      }
    }
  }, []);

  const handleAudioChunk = useCallback(async (audioData) => {
    if (!audioContextRef.current || !audioData.audio_data) {
      console.log('🔊 Skipping audio chunk - no context or data:', {
        hasContext: !!audioContextRef.current,
        hasData: !!audioData.audio_data,
        audioDataLength: audioData.audio_data?.length
      });
      return;
    }

    try {
      console.log('🔊 Processing audio chunk:', {
        speaker: audioData.speaker,
        dataLength: audioData.audio_data.length,
        format: audioData.format,
        contextState: audioContextRef.current.state
      });

      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        console.log('🔊 Resuming suspended audio context');
        await audioContextRef.current.resume();
      }

      // Decode base64 audio data to get raw PCM bytes
      const binaryString = atob(audioData.audio_data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('🔊 Decoded audio data:', {
        originalLength: audioData.audio_data.length,
        bytesLength: bytes.length,
        firstFewBytes: Array.from(bytes.slice(0, 10))
      });

      // Convert μ-law encoded bytes to 16-bit PCM
      // Twilio sends μ-law (G.711) encoded audio data, not raw PCM
      const pcmSamples = new Int16Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        pcmSamples[i] = muLawToPcm(bytes[i]);
      }

      console.log('🔊 Converted to PCM:', {
        samplesLength: pcmSamples.length,
        firstFewSamples: Array.from(pcmSamples.slice(0, 10)),
        maxSample: Math.max(...pcmSamples),
        minSample: Math.min(...pcmSamples)
      });

      // Create AudioBuffer from PCM samples
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // mono channel
        pcmSamples.length,
        8000 // 8kHz sample rate for phone calls
      );

      // Copy PCM data to AudioBuffer
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcmSamples.length; i++) {
        channelData[i] = pcmSamples[i] / 32768.0; // Convert to float [-1, 1]
      }

      console.log('🔊 Created AudioBuffer:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      });

      // Play the audio
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();

      console.log(`🔊 Successfully playing audio chunk from ${audioData.speaker} (${bytes.length} bytes, ${audioBuffer.duration.toFixed(3)}s)`);
    } catch (error) {
      console.error('🔊 Error processing audio chunk:', error);
      console.error('🔊 Audio data details:', {
        speaker: audioData.speaker,
        dataLength: audioData.audio_data?.length,
        format: audioData.format
      });
    }
  }, []);

  // μ-law to PCM conversion function
  const muLawToPcm = useCallback((mulaw) => {
    const BIAS = 0x84;
    const CLIP = 32635;
    
    mulaw = ~mulaw;
    const sign = mulaw & 0x80;
    const exponent = (mulaw >> 4) & 0x07;
    const mantissa = mulaw & 0x0F;
    
    let sample = mantissa << (exponent + 3);
    if (exponent !== 0) {
      sample += BIAS << exponent;
    }
    
    return sign !== 0 ? -sample : sample;
  }, []);

  const enableAudio = useCallback(async () => {
    try {
      await initializeAudioContext();
      setIsAudioEnabled(true);
      console.log('🔊 Real-time audio streaming enabled');
      console.log('🔊 Audio context state:', audioContextRef.current?.state);
      console.log('🔊 Audio context sample rate:', audioContextRef.current?.sampleRate);
    } catch (error) {
      console.error('🔊 Error enabling audio:', error);
      setIsAudioEnabled(false);
    }
  }, [initializeAudioContext]);

  const disableAudio = useCallback(() => {
    setIsAudioEnabled(false);
    if (audioContextRef.current) {
      console.log('🔊 Closing audio context');
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    console.log('🔊 Real-time audio streaming disabled');
  }, []);

  return {
    messages,
    connectionStatus,
    callStatus,
    isConnected,
    error,
    audioChunks,
    isAudioEnabled,
    enableAudio,
    disableAudio,
    clearMessages: () => setMessages([])
  };
};

/**
 * Setup real-time transcript streaming (legacy function for backward compatibility)
 * @param {Object} options - Configuration options
 * @returns {Function} - Cleanup function
 */
export const setupRealTimeTranscript = (options) => {
  console.log('📡 Setting up real-time transcript (legacy function)');
  
  // This is a legacy function that was used before the hook-based approach
  // For now, we'll return a no-op cleanup function
  return () => {
    console.log('📡 Cleaning up real-time transcript (legacy)');
  };
};

/**
 * Format metrics for display
 * @param {Object} transcriptResult - The transcript result from API
 * @param {Array} testMetrics - The test metrics configuration
 * @returns {Array} - Formatted metrics for display
 */
export const formatMetricsForDisplay = (transcriptResult, testMetrics) => {
  if (!transcriptResult?.metrics_results || !testMetrics) {
    return [];
  }

  const metricsResults = transcriptResult.metrics_results;
  
  return Object.entries(metricsResults).map(([metricId, metricData]) => {
    // Find the corresponding test metric for additional info
    const testMetric = testMetrics.find(tm => tm.id === metricId);
    
    return {
      metric_id: metricId,
      metric_name: metricData.metric_name || testMetric?.name || 'Unknown Metric',
      score: metricData.score || 0,
      details: metricData.details?.explanation || 'No explanation available',
      improvement_areas: metricData.improvement_areas || [],
      max_score: testMetric?.max_score || 100,
      description: testMetric?.description || ''
    };
  });
};

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

// Direct Firebase metrics fetching function
export async function fetchMetricsFromFirebase(currentOrganizationUsername, testId) {
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
} 