import React from 'react';
import { Link } from 'react-router-dom';
import { 
  StopCircleIcon, 
  ArrowLeftIcon, 
  ChartBarIcon, 
  PhoneIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';
import { STATUSES } from './constants';

export function RunningActionButtons({ handleCancelTest, cancelling }) {
  return (
    <div className="mt-6 flex justify-end">
      <button
        onClick={handleCancelTest}
        className="btn btn-danger inline-flex items-center"
        disabled={cancelling}
      >
        <StopCircleIcon className="w-5 h-5 mr-1" />
        {cancelling ? 'Cancelling...' : 'Cancel Call'}
      </button>
    </div>
  );
}

export function CompletedActionButtons({ testId, handleRunTest, handleFetchMetricsFromFirebase, fetchingMetrics }) {
  return (
    <div className="mt-6 flex justify-between">
      <div>
        <Link
          to={`/tests/${testId}`}
          className="btn btn-secondary inline-flex items-center mr-2"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-1" />
          Back to Test
        </Link>
        
        <Link
          to={`/tests/${testId}/compare`}
          className="btn btn-primary inline-flex items-center mr-2"
        >
          <ChartBarIcon className="w-5 h-5 mr-1" />
          Compare Results
        </Link>
        
        {handleFetchMetricsFromFirebase && (
          <button
            onClick={handleFetchMetricsFromFirebase}
            className="btn btn-outline inline-flex items-center mr-2"
            disabled={fetchingMetrics}
          >
            <CloudArrowDownIcon className="w-5 h-5 mr-1" />
            {fetchingMetrics ? 'Fetching...' : 'Fetch Metrics'}
          </button>
        )}
      </div>
      
      <button
        onClick={handleRunTest}
        className="btn btn-primary inline-flex items-center"
      >
        <PhoneIcon className="w-5 h-5 mr-1" />
        Run Again
      </button>
    </div>
  );
} 