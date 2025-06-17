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
          console.log('🎭 Audio transcription object:', result.audio_transcription);
          console.log('🎭 Conversation array:', result.audio_transcription?.conversation);
          console.log('🎭 Total segments:', result.audio_transcription?.conversation?.length || 0);
          
          // Log sample segments with timing data
          const conversation = result.audio_transcription?.conversation || [];
          console.log('🎭 FRONTEND: Sample segments with timing:');
          conversation.slice(0, 3).forEach((segment, index) => {
            console.log(`   ${index + 1}. ${segment.speaker} (${segment.timing?.start_time}s - ${segment.timing?.end_time}s):`);
            console.log(`      "${segment.text?.substring(0, 100)}${segment.text?.length > 100 ? '...' : ''}"`);
          });
          
          setTranscriptionData(result);
          const responseAnalysis = calculateResponseTimes(result.audio_transcription.conversation);
          
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

    fetchTranscription();
  }, [testId, organizationId]);

  // Calculate response times between speakers
  const calculateResponseTimes = (conversation) => {
    console.log('🎭 CALCULATE RESPONSE TIMES: Starting calculation...');
    console.log('🎭 Input conversation:', conversation);
    console.log('🎭 Conversation length:', conversation?.length || 0);
    
    if (!conversation || conversation.length < 2) {
      console.log('🎭 CALCULATE RESPONSE TIMES: Not enough conversation segments');
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

    // After filtering, use the first speaker as Restaurant AI
    const firstActualSpeaker = filteredConversation[0]?.speaker;
    const restaurantAISpeaker = firstActualSpeaker;
    const customerSpeaker = firstActualSpeaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';

    console.log('🎭 CALCULATE RESPONSE TIMES: Speaker identification (after filtering):');
    console.log('   First actual speaker:', firstActualSpeaker);
    console.log('   Restaurant AI speaker:', restaurantAISpeaker);
    console.log('   Customer speaker:', customerSpeaker);

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

    console.log('🎭 CALCULATE RESPONSE TIMES: Processing filtered segments...');
    for (let i = 1; i < filteredConversation.length; i++) {
      const currentSegment = filteredConversation[i];
      const previousSegment = filteredConversation[i - 1];
      
      console.log(`🎭 Segment ${i}:`);
      console.log('   Current:', currentSegment.speaker, 'starts at', currentSegment.timing?.start_time);
      console.log('   Previous:', previousSegment.speaker, 'ends at', previousSegment.timing?.end_time);
      
      if (currentSegment.speaker !== previousSegment.speaker) {
        const currentStartTime = parseFloat(currentSegment.timing.start_time);
        const previousEndTime = parseFloat(previousSegment.timing.end_time);
        const responseTime = currentStartTime - previousEndTime;
        
        console.log(`   🎭 Speaker change detected! Response time: ${responseTime.toFixed(7)}s`);
        console.log(`      ${previousEndTime.toFixed(7)}s → ${currentStartTime.toFixed(7)}s = ${responseTime.toFixed(7)}s`);
        
        if (responseTime >= 0) {
          const responseData = {
            speaker: currentSegment.speaker,
            responseTime: responseTime,
            segmentIndex: i,
            previousSpeaker: previousSegment.speaker,
            timestamp: currentStartTime
          };
          
          console.log('   🎭 Valid response time recorded:', responseData);
          responseTimes.push(responseData);
          speakerStats[currentSegment.speaker].responseTimes.push(responseTime);
        } else {
          console.log('   🎭 Negative response time ignored (overlapping speech)');
        }
      } else {
        console.log('   🎭 Same speaker continues, no response time calculated');
      }
    }

    console.log('🎭 CALCULATE RESPONSE TIMES: Computing statistics...');
    Object.keys(speakerStats).forEach(speaker => {
      const times = speakerStats[speaker].responseTimes;
      console.log(`🎭 ${speaker} response times:`, times);
      
      if (times.length > 0) {
        speakerStats[speaker].totalResponseTime = times.reduce((sum, time) => sum + time, 0);
        speakerStats[speaker].avgResponseTime = speakerStats[speaker].totalResponseTime / times.length;
        speakerStats[speaker].fastestResponse = Math.min(...times);
        speakerStats[speaker].slowestResponse = Math.max(...times);
        
        console.log(`   Total: ${speakerStats[speaker].totalResponseTime.toFixed(7)}s`);
        console.log(`   Average: ${speakerStats[speaker].avgResponseTime.toFixed(7)}s`);
        console.log(`   Fastest: ${speakerStats[speaker].fastestResponse.toFixed(7)}s`);
        console.log(`   Slowest: ${speakerStats[speaker].slowestResponse.toFixed(7)}s`);
      }
    });

    const result = {
      responseTimes,
      speakerStats,
      totalResponses: responseTimes.length,
      conversationDuration: filteredConversation.length > 0 ? parseFloat(filteredConversation[filteredConversation.length - 1].timing.end_time) : 0,
      restaurantAISpeaker,
      customerSpeaker
    };

    console.log('🎭 CALCULATE RESPONSE TIMES: Final result:', result);
    return result;
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
          <p className="text-gray-600">{error}</p>
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

  const { responseTimes, speakerStats, totalResponses, conversationDuration, restaurantAISpeaker, customerSpeaker } = responseTimeData;
  
  // Calculate overall performance score
  const fastResponses = responseTimes.filter(r => r.responseTime <= 1.0).length;
  const performanceScore = Math.round((fastResponses / totalResponses) * 100);
  
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
          if (stats.responseTimes.length === 0) return null;
          
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
        </h3>
        
        <div className="space-y-4">
          {responseTimes.slice(0, 8).map((response, index) => {
            const isAI = response.speaker === restaurantAISpeaker;
            const performance = getPerformanceLevel(response.responseTime);
            const maxTime = Math.max(...responseTimes.map(r => r.responseTime));
            const widthPercentage = (response.responseTime / maxTime) * 100;
            
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
                    <span className="font-medium text-gray-800">
                      {isAI ? 'Restaurant AI' : 'Customer'}
                    </span>
                    <span className={`text-sm font-semibold text-${performance.color}-600`}>
                      {formatTime(response.responseTime)}
                    </span>
                  </div>
                  
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
          
          {responseTimes.length > 8 && (
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
              <AnimatedNumber value={responseTimes.filter(r => r.responseTime <= 0.5).length} />
            </div>
            <p className="text-emerald-700 font-medium">Lightning</p>
            <p className="text-emerald-600 text-sm">≤ 0.5s</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <div className="text-2xl font-bold text-green-600 mb-1">
              <AnimatedNumber value={responseTimes.filter(r => r.responseTime > 0.5 && r.responseTime <= 1.0).length} />
            </div>
            <p className="text-green-700 font-medium">Excellent</p>
            <p className="text-green-600 text-sm">0.5s - 1s</p>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-xl">
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              <AnimatedNumber value={responseTimes.filter(r => r.responseTime > 1.0 && r.responseTime <= 2.0).length} />
            </div>
            <p className="text-yellow-700 font-medium">Good</p>
            <p className="text-yellow-600 text-sm">1s - 2s</p>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <div className="text-2xl font-bold text-red-600 mb-1">
              <AnimatedNumber value={responseTimes.filter(r => r.responseTime > 2.0).length} />
            </div>
            <p className="text-red-700 font-medium">Slow</p>
            <p className="text-red-600 text-sm">&gt; 2s</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AudioTranscription; 