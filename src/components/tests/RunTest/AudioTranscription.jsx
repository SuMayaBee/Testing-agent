import React, { useState, useEffect } from 'react';
import { voiceAgentAPI } from '../../../lib/api';
import { 
  SpeakerWaveIcon, 
  ClockIcon,
  UserIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  BoltIcon,
  FireIcon,
  RocketLaunchIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

function AudioTranscription({ testId, organizationId, callSid }) {
  const [transcriptionData, setTranscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responseTimeData, setResponseTimeData] = useState(null);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [isProcessingTranscription, setIsProcessingTranscription] = useState(false);
  const [realTimeTranscript, setRealTimeTranscript] = useState(null);

  useEffect(() => {
    if (testId && organizationId) {
      // COMMENTED OUT: Using real-time WebSocket streaming instead
      // fetchTranscription();
      console.log('📡 AudioTranscription: Real-time transcript now handled by WebSocket streaming');
    }
  }, [testId, organizationId]);

  useEffect(() => {
    async function fetchTranscription() {
      if (!testId || !organizationId) return;

      try {
        setLoading(true);
        setError(null);
        
        console.log('🎭 FRONTEND: Fetching audio transcription...');
        console.log('🎭 Test ID:', testId);
        console.log('🎭 Organization ID:', organizationId);
        
        // Log the API URL being called
        const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/voice-agent/get-audio-transcription/${testId}?organization_id=${organizationId}`;
        console.log('🎭 FRONTEND: API URL:', apiUrl);
        
        const result = await voiceAgentAPI.getAudioTranscription(organizationId, testId);
        
        console.log('🎭 FRONTEND: API Response received:', result);
        
        if (result.status === 'success') {
          console.log('🎭 FRONTEND: Transcription data received successfully');
          
          // ===== GOOGLE CLOUD SPEECH TRANSCRIPT LOGGING =====
          console.log('🎤🎤🎤 ===== GOOGLE CLOUD SPEECH TRANSCRIPT DATA ===== 🎤🎤🎤');
          console.log('🎤 Full result object:', JSON.stringify(result, null, 2));
          console.log('🎤 Result keys:', Object.keys(result || {}));
          console.log('🎤 Audio transcription object:', result.audio_transcription);
          console.log('🎤 Audio transcription keys:', Object.keys(result.audio_transcription || {}));
          console.log('🎤 Conversation array:', result.audio_transcription?.conversation);
          console.log('🎤 Total Google Cloud Speech segments:', result.audio_transcription?.conversation?.length || 0);
          console.log('🎤 Transcription status:', result.transcription_status);
          console.log('🎤 Processing status:', result.processing_status);
          
          // Log all Google Cloud Speech segments in detail
          const conversation = result.audio_transcription?.conversation || [];
          console.log('🎤 ===== ALL GOOGLE CLOUD SPEECH SEGMENTS =====');
          conversation.forEach((segment, index) => {
            console.log(`🎤 GCS Segment ${index + 1}/${conversation.length}:`, {
              speaker: segment.speaker,
              text: segment.text,
              timing: segment.timing,
              confidence: segment.confidence || 'N/A',
              start_time: segment.timing?.start_time,
              end_time: segment.timing?.end_time,
              duration: segment.timing?.duration
            });
            console.log(`🎤 Full segment object:`, JSON.stringify(segment, null, 2));
          });
          console.log('🎤 ===== END GOOGLE CLOUD SPEECH SEGMENTS =====');
          console.log('🎤🎤🎤 ===== END GOOGLE CLOUD SPEECH DATA ===== 🎤🎤🎤');
          
          // CRITICAL DEBUG: Check if conversation data exists
          const conversationArray = result.audio_transcription?.conversation;
          console.log('🔍 CRITICAL DEBUG: Extracted conversation array:', conversationArray);
          console.log('🔍 CRITICAL DEBUG: Is array?', Array.isArray(conversationArray));
          console.log('🔍 CRITICAL DEBUG: Array length:', conversationArray?.length);
          console.log('🔍 CRITICAL DEBUG: First element:', conversationArray?.[0]);
          
          // Log sample segments with timing data
          console.log('🎭 FRONTEND: Sample segments with timing:');
          conversation.slice(0, 3).forEach((segment, index) => {
            console.log(`   ${index + 1}. ${segment.speaker} (${segment.timing?.start_time}s - ${segment.timing?.end_time}s):`);
            console.log(`      "${segment.text?.substring(0, 100)}${segment.text?.length > 100 ? '...' : ''}"`);
          });
          
          setTranscriptionData(result);
          
          // Debug: Log the exact conversation data being passed to calculateResponseTimes
          console.log('🔍 FRONTEND DEBUG: About to call calculateResponseTimes with:', {
            conversationArray: result.audio_transcription?.conversation,
            arrayLength: result.audio_transcription?.conversation?.length,
            firstSegment: result.audio_transcription?.conversation?.[0],
            secondSegment: result.audio_transcription?.conversation?.[1]
          });
          
          // FIXED: Ensure we pass the actual conversation array, not undefined
          const conversationForCalculation = result.audio_transcription?.conversation || [];
          console.log('🔍 FRONTEND DEBUG: Final conversation for calculation:', conversationForCalculation);
          console.log('🔍 FRONTEND DEBUG: Final conversation length:', conversationForCalculation.length);
          
          const responseAnalysis = calculateResponseTimes(conversationForCalculation);
          
          console.log('🎭 FRONTEND: Response time analysis:', responseAnalysis);
          if (responseAnalysis) {
            console.log('🎭 Total responses calculated:', responseAnalysis.totalResponses);
            console.log('🎭 Speaker stats:', responseAnalysis.speakerStats);
            console.log('🎭 Response times array:', responseAnalysis.responseTimes);
          }
          
          setResponseTimeData(responseAnalysis);
          setTimeout(() => setAnimationStarted(true), 300);
        } else if (result.status === 'not_available') {
          console.log('🎭 FRONTEND: Transcription not available yet:', result.message);
          setError(result.message);
        } else {
          console.log('🎭 FRONTEND: Error in transcription result:', result);
          setError(result.message || 'Failed to fetch audio transcription');
        }
        
        // ALSO fetch the real-time transcript for response delay analysis
        await fetchRealTimeTranscript();
        
      } catch (err) {
        console.error('🎭 FRONTEND: Error fetching audio transcription:', err);
        console.error('🎭 FRONTEND: Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        setError('Failed to load audio transcription');
      } finally {
        setLoading(false);
      }
    }

    // Fetch real-time transcript with response delays
    async function fetchRealTimeTranscript() {
      try {
        console.log('🕒🕒🕒 ===== REAL-TIME TRANSCRIPT (NOT GOOGLE CLOUD SPEECH) ===== 🕒🕒🕒');
        console.log('🕒 FRONTEND: Real-time transcript now handled by WebSocket streaming...');
        
        // COMMENTED OUT: This API call is replaced by real-time WebSocket streaming
        // const transcriptResult = await voiceAgentAPI.getTranscript(organizationId, testId);
        
        console.log('🕒 FRONTEND: Real-time transcript is now streamed via WebSocket in TranscriptViewer component');
        console.log('🕒 FRONTEND: No longer polling the old API endpoint to avoid errors');
        
        // Set empty state since real-time data comes through WebSocket
        setRealTimeTranscript({
          messages: [],
          totalMessages: 0,
          callDuration: 0,
          callStatus: 'real-time-streaming',
          note: 'Real-time transcript is now handled by WebSocket streaming in TranscriptViewer component'
        });
        
      } catch (err) {
        console.error('🕒 FRONTEND: Error in fetchRealTimeTranscript (legacy):', err);
      }
    }

    // COMMENTED OUT: fetchTranscription() - now using real-time WebSocket streaming
    console.log('📡 AudioTranscription: Using real-time WebSocket streaming instead of polling');
  }, [testId, organizationId]);

  // Calculate response times between speakers
  const calculateResponseTimes = (conversation) => {
    console.log('🎭 CALCULATE RESPONSE TIMES: Starting calculation...');
    console.log('🎭 Input conversation type:', typeof conversation);
    console.log('🎭 Input conversation:', conversation);
    console.log('🎭 Is array:', Array.isArray(conversation));
    console.log('🎭 Conversation length:', conversation?.length || 0);
    
    // Additional debugging for conversation structure
    if (conversation) {
      console.log('🎭 First 3 segments structure check:');
      for (let i = 0; i < Math.min(3, conversation.length); i++) {
        const segment = conversation[i];
        console.log(`   Segment ${i}:`, {
          speaker: segment?.speaker,
          text: segment?.text?.substring(0, 50) + '...',
          timing: segment?.timing,
          hasRequiredFields: !!(segment?.speaker && segment?.text && segment?.timing)
        });
      }
    }
    
    if (!conversation || !Array.isArray(conversation) || conversation.length < 2) {
      console.log('🎭 CALCULATE RESPONSE TIMES: Not enough conversation segments or invalid data');
      console.log('   Conversation exists:', !!conversation);
      console.log('   Is array:', Array.isArray(conversation));
      console.log('   Length:', conversation?.length || 0);
      return null;
    }

    // Filter out automated messages like "call may be recorded for training purposes"
    const filteredConversation = conversation.filter(segment => {
      const text = segment.text?.toLowerCase() || '';
      const isRecordingMessage = text.includes('call may be recorded') || 
                                text.includes('training purposes') ||
                                text.includes('recorded for training') ||
                                text.includes('may be recorded');
      
      if (isRecordingMessage) {
        console.log('🎭 FILTERING OUT automated message:', segment.speaker, ':', segment.text);
        return false;
      }
      return true;
    });

    console.log('🎭 Original conversation segments:', conversation.length);
    console.log('🎭 Filtered conversation segments:', filteredConversation.length);
    
    if (filteredConversation.length < 2) {
      console.log('🎭 CALCULATE RESPONSE TIMES: Not enough conversation segments after filtering');
      return null;
    }

    // STEP 1: PROCESS THE CONVERSATION WITH DELAY-BASED SPEAKER DETECTION
    console.log('🎭 ===== STEP 1: PROCESSING CONVERSATION WITH DELAY-BASED SPEAKER DETECTION =====');
    
    // After filtering, use the first speaker as Restaurant AI
    const firstActualSpeaker = filteredConversation[0]?.speaker;
    
    // Safety check: ensure we have a valid speaker
    if (!firstActualSpeaker) {
      console.log('🎭 CALCULATE RESPONSE TIMES: No speaker found in first segment');
      console.log('🎭 First segment:', filteredConversation[0]);
      return null;
    }
    
    const restaurantAISpeaker = firstActualSpeaker;
    const customerSpeaker = firstActualSpeaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';

    console.log('🎭 CALCULATE RESPONSE TIMES: Speaker identification (after filtering):');
    console.log('   First actual speaker:', firstActualSpeaker);
    console.log('   Restaurant AI speaker:', restaurantAISpeaker);
    console.log('   Customer speaker:', customerSpeaker);

    // Apply delay-based speaker detection to create processed conversation
    const processedConversation = [];
    
    filteredConversation.forEach((segment, index) => {
      let mappedSpeaker = segment.speaker;
      let processingDecision = 'Original speaker kept';
      let delayInfo = null;
      
      // NEW RULE: If segment contains "sorry", always map to Restaurant AI
      const textLower = segment.text?.toLowerCase().trim() || '';
      const containsSorry = textLower.includes('sorry');
      
      if (containsSorry) {
        mappedSpeaker = restaurantAISpeaker;
        processingDecision = `Contains "sorry" → Mapped to Restaurant AI (${restaurantAISpeaker})`;
        console.log(`🎭 SORRY DETECTED: Segment ${index} contains "sorry" → Mapping to Restaurant AI (${restaurantAISpeaker})`);
        console.log(`   Text: "${segment.text}"`);
      } else if (index > 0) {
        const previousProcessedSegment = processedConversation[index - 1];
        const currentStartTime = parseFloat(segment.timing?.start_time || 0);
        const previousEndTime = parseFloat(filteredConversation[index - 1].timing?.end_time || 0);
        const delay = currentStartTime - previousEndTime;
        const delayInSeconds = Math.round(delay * 10) / 10;
        const isSpecialDelay = delayInSeconds >= 4.3 && delayInSeconds <= 4.5;
        
        delayInfo = {
          delay: delayInSeconds,
          isSpecialDelay: isSpecialDelay,
          previousSpeaker: filteredConversation[index - 1].speaker,
          previousMappedSpeaker: previousProcessedSegment.mappedSpeaker
        };
        
        console.log(`🎭 PROCESSING Segment ${index}:`);
        console.log(`   Raw: ${segment.speaker} (started at ${currentStartTime.toFixed(3)}s)`);
        console.log(`   Previous: ${filteredConversation[index - 1].speaker} → ${previousProcessedSegment.mappedSpeaker} (ended at ${previousEndTime.toFixed(3)}s)`);
        console.log(`   Delay: ${delayInSeconds}s, Special: ${isSpecialDelay}`);
        
        if (isSpecialDelay) {
          // Special delay detected - check if text starts with "sorry"
          const startsWithSorry = textLower.startsWith('sorry');
          
          console.log(`🎭 SPECIAL DELAY DETECTED: ${delayInSeconds}s`);
          console.log(`   Text: "${segment.text}"`);
          console.log(`   Starts with 'sorry': ${startsWithSorry}`);
          
          if (startsWithSorry) {
            // AI correcting itself - keep same speaker as previous
            mappedSpeaker = previousProcessedSegment.mappedSpeaker;
            processingDecision = `Special delay + starts with "sorry" → Same speaker (${mappedSpeaker})`;
            console.log(`🎭 SPECIAL DELAY + SORRY: Keeping same speaker (${mappedSpeaker})`);
          } else {
            // Customer responding after AI pause - switch to different speaker
            mappedSpeaker = previousProcessedSegment.mappedSpeaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';
            processingDecision = `Special delay + no "sorry" → Switch to ${mappedSpeaker}`;
            console.log(`🎭 SPECIAL DELAY + NO SORRY: Switching to ${mappedSpeaker}`);
          }
        }
        else if (delay > 0.6) {
          // Any delay >0.6s that's not special → force alternation from previous MAPPED speaker
          mappedSpeaker = previousProcessedSegment.mappedSpeaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';
          processingDecision = `Large delay (${delayInSeconds}s) → Force alternation to ${mappedSpeaker}`;
          console.log(`🎭 FORCE ALTERNATION: ${delayInSeconds}s > 0.6s → ${mappedSpeaker}`);
        }
        else {
          // Small delay <= 0.6s - keep original speaker
          mappedSpeaker = segment.speaker;
          processingDecision = `Small delay (${delayInSeconds}s) → Keep original ${mappedSpeaker}`;
          console.log(`🎭 SMALL DELAY: Keeping original speaker (${mappedSpeaker})`);
        }
      }
      
      // After delay-based logic, map to Speaker 1 or 2 if needed (handle Speaker 3, 4, etc.)
      // BUT only if it wasn't already set by the "sorry" rule
      if (!containsSorry && mappedSpeaker !== 'Speaker 1' && mappedSpeaker !== 'Speaker 2') {
        const oldSpeaker = mappedSpeaker;
        mappedSpeaker = (restaurantAISpeaker === 'Speaker 1') ? 'Speaker 2' : 'Speaker 1';
        processingDecision += ` + Mapped ${oldSpeaker} → ${mappedSpeaker}`;
        console.log(`🎭 MAPPING UNKNOWN SPEAKER: ${oldSpeaker} → ${mappedSpeaker}`);
      }
      
      // Create processed segment
      const processedSegment = {
        ...segment,
        originalSpeaker: segment.speaker,
        mappedSpeaker: mappedSpeaker,
        processingDecision: processingDecision,
        delayInfo: delayInfo,
        segmentIndex: index,
        containsSorry: containsSorry
      };
      
      processedConversation.push(processedSegment);
      
      console.log(`🎭 PROCESSED Segment ${index}: ${segment.speaker} → ${mappedSpeaker}`);
      console.log(`   Decision: ${processingDecision}`);
    });

    console.log('🎭 ===== PROCESSED CONVERSATION CREATED =====');
    console.log('🎭 Processed segments:', processedConversation.length);
    
    // STEP 2: CALCULATE RESPONSE TIMES USING PROCESSED CONVERSATION
    console.log('🎭 ===== STEP 2: CALCULATING RESPONSE TIMES FROM PROCESSED CONVERSATION =====');

    const responseTimes = [];
    const speakerStats = {
      [restaurantAISpeaker]: {
        responseTimes: [],
        totalResponseTime: 0,
        avgResponseTime: 0,
        fastestResponse: null,
        slowestResponse: null,
        label: 'Restaurant AI'
      },
      [customerSpeaker]: {
        responseTimes: [],
        totalResponseTime: 0,
        avgResponseTime: 0,
        fastestResponse: null,
        slowestResponse: null,
        label: 'Customer'
      }
    };

    // Helper function to record response time using processed data
    const recordResponseTime = (currentProcessedSegment, previousProcessedSegment, responseTime, currentStartTime, segmentIndex) => {
      const responseData = {
        speaker: currentProcessedSegment.mappedSpeaker,
        responseTime: responseTime,
        segmentIndex: segmentIndex,
        previousSpeaker: previousProcessedSegment.mappedSpeaker,
        timestamp: currentStartTime,
        processingDecision: currentProcessedSegment.processingDecision,
        originalSpeaker: currentProcessedSegment.originalSpeaker,
        isProcessed: currentProcessedSegment.originalSpeaker !== currentProcessedSegment.mappedSpeaker
      };
      
      console.log('   🎭 Valid response time recorded:', responseData);
      responseTimes.push(responseData);
      
      // Add to speaker stats
      const mappedSpeaker = currentProcessedSegment.mappedSpeaker;
      if (speakerStats[mappedSpeaker] && speakerStats[mappedSpeaker].responseTimes) {
        speakerStats[mappedSpeaker].responseTimes.push(responseTime);
        console.log(`   🎭 Added response time to ${mappedSpeaker}: ${responseTime.toFixed(7)}s`);
      } else {
        console.log(`   🎭 ERROR: No speakerStats found for mapped speaker: ${mappedSpeaker}`);
        console.log(`   🎭 Available speakers in speakerStats:`, Object.keys(speakerStats));
      }
    };

    // Calculate response times between processed segments
    for (let i = 1; i < processedConversation.length; i++) {
      const currentProcessedSegment = processedConversation[i];
      const previousProcessedSegment = processedConversation[i - 1];
      
      console.log(`🎭 Response Time Analysis - Segment ${i}:`);
      console.log(`   Current: ${currentProcessedSegment.mappedSpeaker} (was: ${currentProcessedSegment.originalSpeaker})`);
      console.log(`   Previous: ${previousProcessedSegment.mappedSpeaker} (was: ${previousProcessedSegment.originalSpeaker})`);
      
      // Only record response time if the MAPPED speakers are different
      if (currentProcessedSegment.mappedSpeaker !== previousProcessedSegment.mappedSpeaker) {
        const currentStartTime = parseFloat(currentProcessedSegment.timing.start_time);
        const previousEndTime = parseFloat(filteredConversation[i - 1].timing.end_time);
        const responseTime = currentStartTime - previousEndTime;
        
        console.log(`🎭 MAPPED SPEAKER CHANGE: Recording response time`);
        console.log(`   ${previousProcessedSegment.mappedSpeaker} → ${currentProcessedSegment.mappedSpeaker}`);
        console.log(`   Response time: ${responseTime.toFixed(7)}s`);
        
        if (responseTime >= 0) {
          recordResponseTime(currentProcessedSegment, previousProcessedSegment, responseTime, currentStartTime, i);
        } else {
          console.log('   🎭 Negative response time ignored (overlapping speech)');
        }
      } else {
        console.log(`   🎭 Same mapped speaker continues: ${currentProcessedSegment.mappedSpeaker}`);
      }
    }

    console.log('🎭 CALCULATE RESPONSE TIMES: Computing statistics...');
    Object.keys(speakerStats).forEach(speaker => {
      const speakerData = speakerStats[speaker];
      
      // Safety check: ensure speakerData exists and has responseTimes array
      if (!speakerData || !Array.isArray(speakerData.responseTimes)) {
        console.log(`🎭 WARNING: Invalid speakerData for ${speaker}:`, speakerData);
        return;
      }
      
      const times = speakerData.responseTimes;
      console.log(`🎭 ${speaker} response times:`, times);
      
      if (times.length > 0) {
        speakerData.totalResponseTime = times.reduce((sum, time) => sum + time, 0);
        speakerData.avgResponseTime = speakerData.totalResponseTime / times.length;
        speakerData.fastestResponse = Math.min(...times);
        speakerData.slowestResponse = Math.max(...times);
        
        console.log(`   Total: ${speakerData.totalResponseTime.toFixed(7)}s`);
        console.log(`   Average: ${speakerData.avgResponseTime.toFixed(7)}s`);
        console.log(`   Fastest: ${speakerData.fastestResponse.toFixed(7)}s`);
        console.log(`   Slowest: ${speakerData.slowestResponse.toFixed(7)}s`);
      }
    });

    const result = {
      responseTimes,
      speakerStats,
      totalResponses: responseTimes.length,
      conversationDuration: processedConversation.length > 0 ? parseFloat(processedConversation[processedConversation.length - 1].timing.end_time) : 0,
      restaurantAISpeaker,
      customerSpeaker,
      processedConversation: processedConversation, // Include the processed conversation for UI display
      originalConversation: filteredConversation // Keep original for comparison
    };

    console.log('🎭 CALCULATE RESPONSE TIMES: Final result:', result);
    return result;
  };

  // Calculate response delays between real-time transcript messages
  const calculateRealTimeResponseDelays = (transcript) => {
    console.log('🕒 CALCULATE REAL-TIME DELAYS: Starting calculation...');
    console.log('🕒 Input transcript type:', typeof transcript);
    console.log('🕒 Input transcript:', transcript);
    console.log('🕒 Is array:', Array.isArray(transcript));
    console.log('🕒 Transcript length:', transcript?.length || 0);
    
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      console.log('🕒 CALCULATE REAL-TIME DELAYS: Invalid or empty transcript data');
      return [];
    }

    // Log the structure of the first few messages to understand the format
    console.log('🕒 CALCULATE REAL-TIME DELAYS: First 3 message structures:');
    for (let i = 0; i < Math.min(3, transcript.length); i++) {
      const message = transcript[i];
      console.log(`   Message ${i}:`, {
        timestamp: message?.timestamp,
        speaker: message?.speaker,
        agent: message?.agent,
        text: message?.text || message?.message,
        session_id: message?.session_id,
        start_time: message?.start_time,
        end_time: message?.end_time,
        duration_seconds: message?.duration_seconds,
        hasTimestamp: !!message?.timestamp,
        timestampType: typeof message?.timestamp
      });
    }

    const messagesWithDelays = [];
    
    // Process each message and calculate delays
    for (let i = 0; i < transcript.length; i++) {
      const currentMessage = transcript[i];
      const previousMessage = i > 0 ? transcript[i - 1] : null;
      
      // Extract text content from either 'text' or 'message' field
      const messageText = currentMessage?.text || currentMessage?.message || '';
      
      // Extract speaker/agent information
      const speaker = currentMessage?.speaker || currentMessage?.agent || 'unknown';
      
      // Extract timestamp and convert to consistent format
      let timestamp = null;
      let timestampMs = null;
      
      if (currentMessage?.timestamp) {
        // Handle different timestamp formats
        if (typeof currentMessage.timestamp === 'string') {
          timestamp = new Date(currentMessage.timestamp);
        } else if (typeof currentMessage.timestamp === 'number') {
          timestamp = new Date(currentMessage.timestamp);
        } else if (currentMessage.timestamp.toDate && typeof currentMessage.timestamp.toDate === 'function') {
          // Firestore timestamp
          timestamp = currentMessage.timestamp.toDate();
        } else if (currentMessage.timestamp.seconds) {
          // Firestore timestamp with seconds/nanoseconds
          timestamp = new Date(currentMessage.timestamp.seconds * 1000 + (currentMessage.timestamp.nanoseconds || 0) / 1000000);
        }
        
        if (timestamp && !isNaN(timestamp.getTime())) {
          timestampMs = timestamp.getTime();
        }
      }
      
      // Calculate response delay if we have timestamps for both current and previous messages
      let responseDelay = null;
      let responseDelayMs = null;
      
      if (previousMessage && timestampMs) {
        let previousTimestampMs = null;
        
        if (previousMessage?.timestamp) {
          let previousTimestamp = null;
          
          if (typeof previousMessage.timestamp === 'string') {
            previousTimestamp = new Date(previousMessage.timestamp);
          } else if (typeof previousMessage.timestamp === 'number') {
            previousTimestamp = new Date(previousMessage.timestamp);
          } else if (previousMessage.timestamp.toDate && typeof previousMessage.timestamp.toDate === 'function') {
            previousTimestamp = previousMessage.timestamp.toDate();
          } else if (previousMessage.timestamp.seconds) {
            previousTimestamp = new Date(previousMessage.timestamp.seconds * 1000 + (previousMessage.timestamp.nanoseconds || 0) / 1000000);
          }
          
          if (previousTimestamp && !isNaN(previousTimestamp.getTime())) {
            previousTimestampMs = previousTimestamp.getTime();
          }
        }
        
        if (previousTimestampMs && timestampMs > previousTimestampMs) {
          responseDelayMs = timestampMs - previousTimestampMs;
          responseDelay = responseDelayMs / 1000; // Convert to seconds
          
          console.log(`🕒 Message ${i}: Response delay calculated: ${responseDelay.toFixed(3)}s (${responseDelayMs}ms)`);
          console.log(`   Previous: ${new Date(previousTimestampMs).toISOString()}`);
          console.log(`   Current:  ${new Date(timestampMs).toISOString()}`);
        }
      }
      
      // Create enhanced message object
      const enhancedMessage = {
        ...currentMessage,
        index: i,
        text: messageText,
        speaker: speaker,
        timestamp: timestamp,
        timestampMs: timestampMs,
        responseDelay: responseDelay,
        responseDelayMs: responseDelayMs,
        formattedTimestamp: timestamp ? timestamp.toISOString() : null,
        formattedTime: timestamp ? timestamp.toLocaleTimeString() : null
      };
      
      messagesWithDelays.push(enhancedMessage);
      
      console.log(`🕒 Processed message ${i}: ${speaker} - "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}" (${responseDelay ? responseDelay.toFixed(3) + 's delay' : 'no delay'})`);
    }
    
    console.log('🕒 CALCULATE REAL-TIME DELAYS: Completed processing');
    console.log('🕒 Total messages processed:', messagesWithDelays.length);
    console.log('🕒 Messages with response delays:', messagesWithDelays.filter(m => m.responseDelay !== null).length);
    
    return messagesWithDelays;
  };

  const formatTime = (seconds) => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    return `${seconds.toFixed(2)}s`;
  };

  const getPerformanceLevel = (responseTime) => {
    if (responseTime <= 0.5) return { level: 'lightning', color: 'emerald', icon: RocketLaunchIcon };
    if (responseTime <= 1.0) return { level: 'excellent', color: 'green', icon: FireIcon };
    if (responseTime <= 1.5) return { level: 'good', color: 'yellow', icon: BoltIcon };
    if (responseTime <= 2.5) return { level: 'fair', color: 'orange', icon: ClockIcon };
    return { level: 'slow', color: 'red', icon: SparklesIcon };
  };

  // Animated Number Component
  const AnimatedNumber = ({ value, duration = 1500, suffix = '' }) => {
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
      if (!animationStarted) return;
      
      let start = 0;
      const increment = value / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(start);
        }
      }, 16);
      
      return () => clearInterval(timer);
    }, [value, duration, animationStarted]);
    
    return <span>{Math.round(displayValue * 100) / 100}{suffix}</span>;
  };

  // Circular Progress Component
  const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = 'blue' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    
    const colorClasses = {
      emerald: 'stroke-emerald-500',
      green: 'stroke-green-500',
      yellow: 'stroke-yellow-500',
      orange: 'stroke-orange-500',
      red: 'stroke-red-500',
      blue: 'stroke-blue-500'
    };
    
    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={animationStarted ? offset : circumference}
            className={`${colorClasses[color]} transition-all duration-1000 ease-out`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-700">
            <AnimatedNumber value={percentage} suffix="%" />
          </span>
        </div>
      </div>
    );
  };

  // Manual transcription trigger function
  const triggerManualTranscription = async () => {
    if (!testId || !organizationId) return;

    try {
      setIsProcessingTranscription(true);
      setError(null);
      
      console.log('🎤 FRONTEND: Triggering manual transcription...');
      console.log('🎤 Test ID:', testId);
      console.log('🎤 Organization ID:', organizationId);
      
      const result = await voiceAgentAPI.triggerManualTranscription(organizationId, testId);
      
      console.log('🎤 FRONTEND: Manual transcription result:', result);
      
      if (result.status === 'success') {
        console.log('🎤 FRONTEND: Manual transcription triggered successfully');
        // Wait a moment and then fetch the transcription
        setTimeout(async () => {
          try {
            const transcriptionResult = await voiceAgentAPI.getAudioTranscription(organizationId, testId);
            if (transcriptionResult.status === 'success') {
              setTranscriptionData(transcriptionResult);
              
              // FIXED: Extract conversation array properly
              const conversationForCalculation = transcriptionResult.audio_transcription?.conversation || [];
              const responseAnalysis = calculateResponseTimes(conversationForCalculation);
              
              setResponseTimeData(responseAnalysis);
              setTimeout(() => setAnimationStarted(true), 300);
              setError(null);
            }
          } catch (fetchError) {
            console.error('🎤 FRONTEND: Error fetching transcription after manual trigger:', fetchError);
          }
        }, 3000); // Wait 3 seconds for processing
      } else {
        console.log('🎤 FRONTEND: Manual transcription failed:', result.message);
        setError(result.message || 'Failed to trigger manual transcription');
      }
    } catch (err) {
      console.error('🎤 FRONTEND: Error triggering manual transcription:', err);
      setError('Failed to trigger manual transcription');
    } finally {
      setIsProcessingTranscription(false);
    }
  };

  // Manual refresh function for debugging
  const manualRefresh = async () => {
    console.log('🔄 MANUAL REFRESH: Starting manual refresh...');
    try {
      setLoading(true);
      setError(null);
      
      const result = await voiceAgentAPI.getAudioTranscription(organizationId, testId);
      console.log('🔄 MANUAL REFRESH: API Response:', result);
      
      if (result.status === 'success') {
        console.log('🔄 MANUAL REFRESH: Setting transcription data...');
        setTranscriptionData(result);
        
        console.log('🔄 MANUAL REFRESH: Calculating response times...');
        
        // FIXED: Extract conversation array properly
        const conversationForCalculation = result.audio_transcription?.conversation || [];
        console.log('🔄 MANUAL REFRESH: Conversation array for calculation:', conversationForCalculation);
        console.log('🔄 MANUAL REFRESH: Conversation length:', conversationForCalculation.length);
        
        const responseAnalysis = calculateResponseTimes(conversationForCalculation);
        console.log('🔄 MANUAL REFRESH: Response analysis result:', responseAnalysis);
        
        setResponseTimeData(responseAnalysis);
        setTimeout(() => setAnimationStarted(true), 300);
        setError(null);
      } else {
        setError(result.message || 'Failed to fetch audio transcription');
      }
    } catch (err) {
      console.error('🔄 MANUAL REFRESH: Error:', err);
      setError('Failed to refresh transcription');
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh function to window for debugging
  useEffect(() => {
    window.debugRefreshTranscription = manualRefresh;
    return () => {
      delete window.debugRefreshTranscription;
    };
  }, [testId, organizationId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex items-center justify-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Analyzing Conversation</h3>
            <p className="text-gray-500">Processing response times...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Analysis Pending</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          
          {/* Manual Transcription Trigger Button */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={triggerManualTranscription}
                disabled={isProcessingTranscription}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {isProcessingTranscription ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing Transcription...
                  </>
                ) : (
                  <>
                    <SpeakerWaveIcon className="h-5 w-5 mr-2" />
                    Get Google Cloud Speech Transcription
                  </>
                )}
              </button>
              
              <button
                onClick={manualRefresh}
                disabled={loading || isProcessingTranscription}
                className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Data
                  </>
                )}
              </button>
            </div>
            
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Try "Refresh Data" first if transcription was already processed. Use "Get Google Cloud Speech Transcription" to reprocess the audio.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!responseTimeData || responseTimeData.totalResponses === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center">
          <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Data Available</h3>
          <p className="text-gray-600">Response time analysis will appear here after processing.</p>
        </div>
      </div>
    );
  }

  // Safe destructuring with default values to prevent undefined errors
  const {
    responseTimes = [],
    speakerStats = {},
    totalResponses = 0,
    conversationDuration = 0,
    restaurantAISpeaker = 'Speaker 1',
    customerSpeaker = 'Speaker 2'
  } = responseTimeData || {};

  // Additional safety check - if responseTimes is not an array or empty, show no data
  if (!Array.isArray(responseTimes) || responseTimes.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center">
          <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Response Times Available</h3>
          <p className="text-gray-600">Response time analysis will appear here when conversation data is available.</p>
        </div>
      </div>
    );
  }

  // Calculate overall performance score
  const fastResponses = (responseTimes && Array.isArray(responseTimes)) ? responseTimes.filter(r => r && r.responseTime <= 1.0).length : 0;
  const performanceScore = totalResponses > 0 ? Math.round((fastResponses / totalResponses) * 100) : 0;
  
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Response Time Analysis</h2>
            <p className="text-blue-100">Real-time conversation performance insights</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              <AnimatedNumber value={totalResponses} />
            </div>
            <p className="text-blue-100">Total Responses</p>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Score */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Overall Performance</h3>
          <CircularProgress 
            percentage={performanceScore} 
            color={performanceScore >= 80 ? 'emerald' : performanceScore >= 60 ? 'yellow' : 'red'} 
          />
          <p className="text-gray-600 mt-4">
            {performanceScore >= 80 ? 'Excellent' : performanceScore >= 60 ? 'Good' : 'Needs Improvement'}
          </p>
        </div>

        {/* Speaker Performance Cards */}
        {Object.entries(speakerStats).map(([speaker, stats]) => {
          // Safety check for stats object and responseTimes array
          if (!stats || !stats.responseTimes || !Array.isArray(stats.responseTimes) || stats.responseTimes.length === 0) return null;
          
          const isAI = speaker === restaurantAISpeaker;
          const performance = getPerformanceLevel(stats.avgResponseTime);
          const IconComponent = isAI ? ComputerDesktopIcon : UserIcon;
          
          return (
            <div key={speaker} className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-full ${isAI ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <IconComponent className={`h-6 w-6 ${isAI ? 'text-green-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{stats.label}</h3>
                    <p className="text-gray-500 text-sm">{stats.responseTimes.length} responses</p>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 text-${performance.color}-600`}>
                  {animationStarted ? formatTime(stats.avgResponseTime) : '0.00s'}
                </div>
                <p className="text-gray-600 mb-4">Average Response Time</p>
                
                <div className="flex justify-between text-sm">
                  <div className="text-center">
                    <div className="text-green-600 font-semibold">
                      {animationStarted ? formatTime(stats.fastestResponse) : '0ms'}
                    </div>
                    <p className="text-gray-500">Fastest</p>
                  </div>
                  <div className="text-center">
                    <div className="text-red-600 font-semibold">
                      {animationStarted ? formatTime(stats.slowestResponse) : '0ms'}
                    </div>
                    <p className="text-gray-500">Slowest</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Response Timeline */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <ClockIcon className="h-6 w-6 mr-3 text-blue-600" />
          Response Timeline
          <span className="ml-3 text-sm font-normal text-gray-500">
            (Based on Processed Conversation)
          </span>
        </h3>
        
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Analysis Based On:</strong> Processed conversation with: 
            1) "Sorry" segments → Restaurant AI, 
            2) Delay-based speaker detection applied. 
            Response times calculated from speaker changes in the processed data.
          </p>
        </div>
        
        <div className="space-y-4">
          {(responseTimes && Array.isArray(responseTimes) ? responseTimes.slice(0, 8) : []).map((response, index) => {
            // Safety checks for response object
            if (!response || typeof response.responseTime !== 'number') {
              return null;
            }
            
            const isAI = response.speaker === restaurantAISpeaker;
            const performance = getPerformanceLevel(response.responseTime);
            
            // Safe calculation of maxTime with fallback
            const validResponseTimes = (responseTimes && Array.isArray(responseTimes)) ? 
              responseTimes.filter(r => r && typeof r.responseTime === 'number').map(r => r.responseTime) : [];
            const maxTime = validResponseTimes.length > 0 ? Math.max(...validResponseTimes) : (response.responseTime || 1);
            const widthPercentage = maxTime > 0 ? (response.responseTime / maxTime) * 100 : 0;
            
            return (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isAI ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {isAI ? (
                    <ComputerDesktopIcon className="h-6 w-6 text-green-600" />
                  ) : (
                    <UserIcon className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-gray-800">
                        {isAI ? 'Restaurant AI' : 'Customer'}
                      </span>
                      {response.isProcessed && (
                        <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                          Processed (was: {response.originalSpeaker})
                        </span>
                      )}
                    </div>
                    <span className={`text-sm font-semibold text-${performance.color}-600`}>
                      {formatTime(response.responseTime)}
                    </span>
                  </div>
                  
                  {response.processingDecision && (
                    <div className="text-xs text-gray-500 mb-2">
                      Processing: {response.processingDecision}
                    </div>
                  )}
                  
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full bg-gradient-to-r transition-all duration-1000 ease-out ${
                        performance.color === 'emerald' ? 'from-emerald-400 to-emerald-600' :
                        performance.color === 'green' ? 'from-green-400 to-green-600' :
                        performance.color === 'yellow' ? 'from-yellow-400 to-yellow-600' :
                        performance.color === 'orange' ? 'from-orange-400 to-orange-600' :
                        'from-red-400 to-red-600'
                      }`}
                      style={{ 
                        width: animationStarted ? `${widthPercentage}%` : '0%',
                        transitionDelay: `${index * 100}ms`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {responseTimes && Array.isArray(responseTimes) && responseTimes.length > 8 && (
            <div className="text-center py-4">
              <p className="text-gray-500">
                Showing 8 of {responseTimes.length} responses
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">Performance Summary</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-emerald-50 rounded-xl">
            <div className="text-2xl font-bold text-emerald-600 mb-1">
              <AnimatedNumber value={(responseTimes && Array.isArray(responseTimes)) ? responseTimes.filter(r => r && r.responseTime <= 0.5).length : 0} />
            </div>
            <p className="text-emerald-700 font-medium">Lightning</p>
            <p className="text-emerald-600 text-sm">≤ 0.5s</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <div className="text-2xl font-bold text-green-600 mb-1">
              <AnimatedNumber value={(responseTimes && Array.isArray(responseTimes)) ? responseTimes.filter(r => r && r.responseTime > 0.5 && r.responseTime <= 1.0).length : 0} />
            </div>
            <p className="text-green-700 font-medium">Excellent</p>
            <p className="text-green-600 text-sm">0.5s - 1s</p>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-xl">
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              <AnimatedNumber value={(responseTimes && Array.isArray(responseTimes)) ? responseTimes.filter(r => r && r.responseTime > 1.0 && r.responseTime <= 2.0).length : 0} />
            </div>
            <p className="text-yellow-700 font-medium">Good</p>
            <p className="text-yellow-600 text-sm">1s - 2s</p>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <div className="text-2xl font-bold text-red-600 mb-1">
              <AnimatedNumber value={(responseTimes && Array.isArray(responseTimes)) ? responseTimes.filter(r => r && r.responseTime > 2.0).length : 0} />
            </div>
            <p className="text-red-700 font-medium">Slow</p>
            <p className="text-red-600 text-sm">&gt; 2s</p>
          </div>
        </div>
      </div>

      {/* Raw Google Cloud Speech Transcript */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <SpeakerWaveIcon className="h-6 w-6 mr-3 text-purple-600" />
          Raw Google Cloud Speech Transcript
          <span className="ml-3 text-sm font-normal text-purple-500">
            (Original - No Processing Applied)
          </span>
        </h3>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {transcriptionData?.audio_transcription?.conversation?.map((segment, index) => {
            // Show the RAW Google Cloud Speech data without any processing
            const startTime = parseFloat(segment.timing?.start_time || 0);
            const endTime = parseFloat(segment.timing?.end_time || 0);
            const duration = parseFloat(segment.timing?.duration || 0);
            
            // Calculate delay from previous segment for display
            let delayInfo = '';
            if (index > 0) {
              const previousSegment = transcriptionData.audio_transcription.conversation[index - 1];
              const currentStartTime = parseFloat(segment.timing?.start_time || 0);
              const previousEndTime = parseFloat(previousSegment.timing?.end_time || 0);
              const delay = currentStartTime - previousEndTime;
              const delayInSeconds = Math.round(delay * 10) / 10;
              delayInfo = ` (${delayInSeconds}s delay)`;
            }
            
            // Map Speaker 1/2 to user-friendly labels for display
            const isRestaurantAI = segment.speaker === restaurantAISpeaker;
            const displaySpeaker = isRestaurantAI ? 'Restaurant AI' : 'Customer';
            const originalSpeaker = segment.speaker; // Keep track of original for debugging
            
            // Use appropriate styling for each speaker type
            const speakerColor = isRestaurantAI ? 'text-green-600' : 'text-blue-600';
            const bgColor = isRestaurantAI ? 'bg-green-100' : 'bg-blue-100';
            
            return (
              <div key={index} className="flex items-start space-x-4 p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                  <span className={`text-xs font-bold ${speakerColor}`}>
                    {isRestaurantAI ? 'AI' : 'C'}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-semibold text-gray-800`}>
                      {displaySpeaker}
                      <span className="ml-2 text-xs text-gray-400 font-normal">
                        ({originalSpeaker})
                      </span>
                      <span className="ml-2 text-xs text-purple-600 font-normal">
                        {delayInfo}
                      </span>
                    </h4>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span className="flex items-center">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {startTime.toFixed(1)}s - {endTime.toFixed(1)}s
                      </span>
                      <span className="px-2 py-1 bg-gray-200 rounded-full">
                        {duration.toFixed(1)}s
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 leading-relaxed">
                    {segment.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-purple-50 rounded-xl">
          <div className="flex items-center justify-between text-sm text-purple-700">
            <span>
              <strong>Note:</strong> This shows the original Google Cloud Speech transcript with user-friendly speaker labels.
            </span>
            <span>
              <strong>Total Segments:</strong> {transcriptionData?.audio_transcription?.conversation?.length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Conversation Transcript */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
          <SpeakerWaveIcon className="h-6 w-6 mr-3 text-blue-600" />
          Processed Conversation Transcript with Analysis
          <span className="ml-3 text-sm font-normal text-gray-500">
            ({transcriptionData?.audio_transcription?.conversation?.length || 0} segments)
          </span>
        </h3>
        
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Processing Applied:</strong> 
            1) Any segment containing "sorry" → Restaurant AI. 
            2) Delay-based speaker detection with 0.6s threshold. 
            3) Special delays (4.3-4.5s) preserve same speaker, other delays &gt;0.6s force alternation.
            Response time analysis based on this processed data.
          </p>
        </div>

        {/* Analysis Summary Cards */}
        {responseTimeData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl">
              <div className="text-2xl font-bold">{responseTimeData.totalResponses}</div>
              <div className="text-blue-100">Response Exchanges</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl">
              <div className="text-2xl font-bold">
                {responseTimeData.speakerStats[restaurantAISpeaker]?.avgResponseTime ? 
                  formatTime(responseTimeData.speakerStats[restaurantAISpeaker].avgResponseTime) : 'N/A'}
              </div>
              <div className="text-green-100">AI Avg Response</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl">
              <div className="text-2xl font-bold">
                {responseTimeData.speakerStats[customerSpeaker]?.avgResponseTime ? 
                  formatTime(responseTimeData.speakerStats[customerSpeaker].avgResponseTime) : 'N/A'}
              </div>
              <div className="text-purple-100">Customer Avg Response</div>
            </div>
          </div>
        )}

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {(() => {
            // Use the processed conversation data from responseTimeData if available
            const processedSegments = responseTimeData?.processedConversation || [];
            
            if (processedSegments.length === 0) {
              // Fallback to original processing if no processed data available
              const mappedSegments = [];
              
              return transcriptionData?.audio_transcription?.conversation?.map((segment, index) => {
                // Apply the same processing logic as in calculateResponseTimes
                let mappedSpeaker = segment.speaker;
                let actualSpeakerDetected = segment.speaker;
                let processingDecision = 'Original speaker kept';
                let isResponseTime = false;
                let responseTimeValue = null;
                
                // NEW RULE: If segment contains "sorry", always map to Restaurant AI
                const textLower = segment.text?.toLowerCase().trim() || '';
                const containsSorry = textLower.includes('sorry');
                
                if (containsSorry) {
                  mappedSpeaker = restaurantAISpeaker;
                  processingDecision = `Contains "sorry" → Mapped to Restaurant AI (${restaurantAISpeaker})`;
                } else if (index > 0) {
                  const previousSegment = transcriptionData.audio_transcription.conversation[index - 1];
                  const currentStartTime = parseFloat(segment.timing?.start_time || 0);
                  const previousEndTime = parseFloat(previousSegment.timing?.end_time || 0);
                  const delay = currentStartTime - previousEndTime;
                  const delayInSeconds = Math.round(delay * 10) / 10;
                  const isSpecialDelay = delayInSeconds >= 4.3 && delayInSeconds <= 4.5;
                  
                  const previousMappedSpeaker = mappedSegments[index - 1] || 'Speaker 1';
                  
                  if (isSpecialDelay) {
                    const startsWithSorry = textLower.startsWith('sorry');
                    
                    if (startsWithSorry) {
                      mappedSpeaker = previousMappedSpeaker;
                      processingDecision = `Special delay + starts with "sorry" → Same speaker (${mappedSpeaker})`;
                    } else {
                      mappedSpeaker = previousMappedSpeaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';
                      processingDecision = `Special delay + no "sorry" → Switch to ${mappedSpeaker}`;
                      isResponseTime = true;
                      responseTimeValue = delay;
                    }
                  }
                  else if (delay > 0.6) {
                    mappedSpeaker = previousMappedSpeaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';
                    processingDecision = `Large delay (${delayInSeconds}s) → Force alternation to ${mappedSpeaker}`;
                    isResponseTime = true;
                    responseTimeValue = delay;
                  }
                  else {
                    mappedSpeaker = segment.speaker;
                    processingDecision = `Small delay (${delayInSeconds}s) → Keep original ${mappedSpeaker}`;
                    
                    // Check if original speakers were different
                    if (segment.speaker !== previousSegment.speaker) {
                      isResponseTime = true;
                      responseTimeValue = delay;
                    }
                  }
                }
                
                // Map unknown speakers (but only if not already set by "sorry" rule)
                if (!containsSorry && mappedSpeaker !== 'Speaker 1' && mappedSpeaker !== 'Speaker 2') {
                  const oldSpeaker = mappedSpeaker;
                  mappedSpeaker = (restaurantAISpeaker === 'Speaker 1') ? 'Speaker 2' : 'Speaker 1';
                  processingDecision += ` + Mapped ${oldSpeaker} → ${mappedSpeaker}`;
                }
                
                mappedSegments[index] = mappedSpeaker;
                
                const isAI = mappedSpeaker === restaurantAISpeaker;
                const startTime = parseFloat(segment.timing?.start_time || 0);
                const endTime = parseFloat(segment.timing?.end_time || 0);
                const duration = parseFloat(segment.timing?.duration || 0);
                
                // Get performance level if this is a response time
                let performance = null;
                if (isResponseTime && responseTimeValue !== null) {
                  performance = getPerformanceLevel(responseTimeValue);
                }
                
                return (
                  <div key={index} className={`flex items-start space-x-4 p-4 rounded-xl transition-all duration-300 ${
                    isAI ? 'bg-green-50 border border-green-100' : 'bg-blue-50 border border-blue-100'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isAI ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {isAI ? (
                        <ComputerDesktopIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <UserIcon className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className={`font-semibold ${isAI ? 'text-green-800' : 'text-blue-800'}`}>
                            {isAI ? 'Restaurant AI' : 'Customer'}
                            <span className="ml-2 text-xs text-gray-500 font-normal">
                              #{index + 1}
                            </span>
                            {actualSpeakerDetected !== mappedSpeaker && (
                              <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                                (was: {actualSpeakerDetected})
                              </span>
                            )}
                          </h4>
                          {isResponseTime && responseTimeValue !== null && (
                            <div className="mt-1">
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                performance?.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                                performance?.color === 'green' ? 'bg-green-100 text-green-700' :
                                performance?.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                performance?.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                ⚡ Response: {formatTime(responseTimeValue)} ({performance?.level})
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            {startTime.toFixed(1)}s - {endTime.toFixed(1)}s
                          </span>
                          <span className="px-2 py-1 bg-gray-200 rounded-full">
                            {duration.toFixed(1)}s
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        <strong>Processing:</strong> {processingDecision}
                      </div>
                      
                      <p className="text-gray-700 leading-relaxed">
                        {segment.text}
                      </p>
                    </div>
                  </div>
                );
              });
            } else {
              // Use the processed conversation data from calculateResponseTimes
              return processedSegments.map((processedSegment, index) => {
                const isAI = processedSegment.mappedSpeaker === restaurantAISpeaker;
                const startTime = parseFloat(processedSegment.timing?.start_time || 0);
                const endTime = parseFloat(processedSegment.timing?.end_time || 0);
                const duration = parseFloat(processedSegment.timing?.duration || 0);
                
                // Check if this segment triggered a response time
                const correspondingResponseTime = responseTimes?.find(rt => rt.segmentIndex === index);
                
                return (
                  <div key={index} className={`flex items-start space-x-4 p-4 rounded-xl transition-all duration-300 ${
                    isAI ? 'bg-green-50 border border-green-100' : 'bg-blue-50 border border-blue-100'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isAI ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {isAI ? (
                        <ComputerDesktopIcon className="h-5 w-5 text-green-600" />
                      ) : (
                        <UserIcon className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className={`font-semibold ${isAI ? 'text-green-800' : 'text-blue-800'}`}>
                            {isAI ? 'Restaurant AI' : 'Customer'}
                            <span className="ml-2 text-xs text-gray-500 font-normal">
                              #{index + 1}
                            </span>
                            {processedSegment.originalSpeaker !== processedSegment.mappedSpeaker && (
                              <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                                (was: {processedSegment.originalSpeaker})
                              </span>
                            )}
                          </h4>
                          {correspondingResponseTime && (
                            <div className="mt-1">
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                getPerformanceLevel(correspondingResponseTime.responseTime).color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                                getPerformanceLevel(correspondingResponseTime.responseTime).color === 'green' ? 'bg-green-100 text-green-700' :
                                getPerformanceLevel(correspondingResponseTime.responseTime).color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                getPerformanceLevel(correspondingResponseTime.responseTime).color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                ⚡ Response: {formatTime(correspondingResponseTime.responseTime)} ({getPerformanceLevel(correspondingResponseTime.responseTime).level})
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            {startTime.toFixed(1)}s - {endTime.toFixed(1)}s
                          </span>
                          <span className="px-2 py-1 bg-gray-200 rounded-full">
                            {duration.toFixed(1)}s
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        <strong>Processing:</strong> {processedSegment.processingDecision}
                      </div>
                      
                      <p className="text-gray-700 leading-relaxed">
                        {processedSegment.text}
                      </p>
                    </div>
                  </div>
                );
              });
            }
          })()}
        </div>
        
        {transcriptionData?.audio_transcription?.conversation?.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {conversationDuration?.toFixed(1) || '0.0'}s
                </div>
                <div className="text-gray-600">Total Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {responseTimeData?.totalResponses || 0}
                </div>
                <div className="text-gray-600">Response Exchanges</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {responseTimeData?.speakerStats[restaurantAISpeaker]?.responseTimes?.length || 0}
                </div>
                <div className="text-gray-600">AI Responses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {responseTimeData?.speakerStats[customerSpeaker]?.responseTimes?.length || 0}
                </div>
                <div className="text-gray-600">Customer Responses</div>
              </div>
            </div>
            
            {/* Performance Summary */}
            {responseTimeData && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-gray-700 mb-2">AI Performance:</div>
                    <div className="space-y-1">
                      {responseTimeData.speakerStats[restaurantAISpeaker]?.fastestResponse && (
                        <div>Fastest: <span className="font-semibold text-green-600">{formatTime(responseTimeData.speakerStats[restaurantAISpeaker].fastestResponse)}</span></div>
                      )}
                      {responseTimeData.speakerStats[restaurantAISpeaker]?.slowestResponse && (
                        <div>Slowest: <span className="font-semibold text-red-600">{formatTime(responseTimeData.speakerStats[restaurantAISpeaker].slowestResponse)}</span></div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700 mb-2">Customer Performance:</div>
                    <div className="space-y-1">
                      {responseTimeData.speakerStats[customerSpeaker]?.fastestResponse && (
                        <div>Fastest: <span className="font-semibold text-green-600">{formatTime(responseTimeData.speakerStats[customerSpeaker].fastestResponse)}</span></div>
                      )}
                      {responseTimeData.speakerStats[customerSpeaker]?.slowestResponse && (
                        <div>Slowest: <span className="font-semibold text-red-600">{formatTime(responseTimeData.speakerStats[customerSpeaker].slowestResponse)}</span></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <span className="text-sm text-gray-600">
                <strong>Processing Status:</strong> 
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  ✓ Delay-based speaker detection applied
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AudioTranscription;