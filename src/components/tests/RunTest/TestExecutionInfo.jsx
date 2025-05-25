import React from 'react';
import { formatScore, getScoreClass } from './constants';
import { WifiIcon, SignalIcon, CloudArrowUpIcon, CheckCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline';

function TestExecutionInfo({ 
  simulationId, 
  selectedPhoneNumber, 
  overallScore, 
  realtimeMonitoring, 
  monitoredCalls,
  onSaveTranscriptToFirebase,
  onTestFirebaseConnection,
  onManualMetricsEvaluation,
  callSid,
  showMetricsButton
}) {
  return (
    <div className="mb-4">
      <p>
        <span className="font-medium">Target Phone:</span> {selectedPhoneNumber}
      </p>
      {simulationId && (
        <p>
          <span className="font-medium">Simulation ID:</span> {simulationId}
        </p>
      )}
      {realtimeMonitoring && (
        <p className="flex items-center">
          <span className="font-medium">Real-time Monitoring:</span>
          <span className="ml-2 flex items-center text-green-600">
            <SignalIcon className="w-4 h-4 mr-1 animate-pulse" />
            Active
          </span>
          {monitoredCalls.length > 0 && (
            <span className="ml-2 text-sm text-secondary-600">
              ({monitoredCalls.length} call{monitoredCalls.length !== 1 ? 's' : ''} monitored)
            </span>
          )}
        </p>
      )}
      {overallScore !== null && overallScore !== undefined && (
        <p>
          <span className="font-medium">Overall Score:</span> 
          <span className={`ml-2 ${getScoreClass(overallScore)} font-semibold`}>
            {formatScore(overallScore)}/10
          </span>
        </p>
      )}
      
      {/* Debug buttons */}
      {(onSaveTranscriptToFirebase || onTestFirebaseConnection || showMetricsButton) && (
        <div className="mt-3 space-x-2">
          {onTestFirebaseConnection && (
            <button
              onClick={onTestFirebaseConnection}
              className="inline-flex items-center px-3 py-1 border border-secondary-300 shadow-sm text-xs font-medium rounded text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <CheckCircleIcon className="w-4 h-4 mr-1" />
              Test Firebase
            </button>
          )}
          {onSaveTranscriptToFirebase && (
            <button
              onClick={onSaveTranscriptToFirebase}
              className="inline-flex items-center px-3 py-1 border border-secondary-300 shadow-sm text-xs font-medium rounded text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <CloudArrowUpIcon className="w-4 h-4 mr-1" />
              Save to Firebase (Debug)
            </button>
          )}
          {showMetricsButton && onManualMetricsEvaluation && (
            <button
              onClick={onManualMetricsEvaluation}
              className="inline-flex items-center px-3 py-1 border border-orange-300 shadow-sm text-xs font-medium rounded text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <ChartBarIcon className="w-4 h-4 mr-1" />
              Trigger Metrics Evaluation
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TestExecutionInfo; 