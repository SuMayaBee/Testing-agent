import React from 'react';
import { formatScore, getScoreClass } from './constants';

function TestExecutionInfo({ simulationId, selectedPhoneNumber, overallScore }) {
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
      {overallScore !== null && overallScore !== undefined && (
        <p>
          <span className="font-medium">Overall Score:</span> 
          <span className={`ml-2 ${getScoreClass(overallScore)} font-semibold`}>
            {formatScore(overallScore)}/10
          </span>
        </p>
      )}
    </div>
  );
}

export default TestExecutionInfo; 