import React from 'react';
import { formatScore, getScoreClass, STATUSES } from './constants';

function TestExecutionHeader({ simulationStatus, simulationId, selectedPhoneNumber, overallScore }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-semibold">Test Execution</h2>
      <div className={`
        px-3 py-1 rounded-full text-sm font-medium
        ${simulationStatus === STATUSES.RUNNING ? 'bg-yellow-100 text-yellow-800' : 
          simulationStatus === STATUSES.COMPLETED ? 'bg-green-100 text-green-800' : 
          'bg-red-100 text-red-800'}
      `}>
        {simulationStatus === STATUSES.RUNNING ? 'Running' : 
         simulationStatus === STATUSES.COMPLETED ? 'Completed' : 
         'Failed'}
      </div>
    </div>
  );
}


export default TestExecutionHeader; 