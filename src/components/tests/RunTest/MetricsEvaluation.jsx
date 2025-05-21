import React from 'react';
import { formatScore, getScoreClass } from './constants';

function MetricsEvaluation({ metricsResults, transcript }) {
  // Debug log to check what we're receiving
  console.log("MetricsEvaluation - metricsResults:", metricsResults);
  console.log("MetricsEvaluation - transcript:", transcript);

  // Check if we have evaluation metadata in the transcript
  const hasEvalMetadata = transcript && 
                          transcript.length > 0 && 
                          transcript[0]?.eval_metadata;
  
  // Extract improvement areas from evaluation metadata
  const improvementAreas = hasEvalMetadata ? 
                          transcript[0].eval_metadata.improvement_areas || [] : 
                          [];
                          
  // Extract summary from evaluation metadata
  const evalSummary = hasEvalMetadata ? 
                    transcript[0].eval_metadata.summary : 
                    '';

  return (
    <div className="mb-6">
      <h3 className="font-medium mb-3">Metrics Evaluation</h3>
      
      {/* Display evaluation summary if available */}
      {evalSummary && (
        <div className="mb-4 border border-secondary-200 rounded-md p-4 bg-white">
          <div className="flex items-center mb-3">
            <div className="w-1 h-5 bg-blue-500 rounded-r mr-2"></div>
            <h4 className="font-medium text-blue-700">Evaluation Summary</h4>
          </div>
          <p className="text-sm text-secondary-700">{evalSummary}</p>
        </div>
      )}
      
      {/* Display improvement areas if available */}
      {improvementAreas.length > 0 && (
        <div className="mb-4 border border-secondary-200 rounded-md p-4 bg-white">
          <div className="flex items-center mb-3">
            <div className="w-1 h-5 bg-primary-500 rounded-r mr-2"></div>
            <h4 className="font-medium text-primary-700">Overall Improvement Areas</h4>
          </div>
          <div className="space-y-2">
            {improvementAreas.map((area, index) => (
              <div key={index} className="flex items-start bg-white rounded-md p-3 border border-secondary-200 shadow-sm">
                <div className={`px-2 py-1 rounded-full text-xs font-medium mr-3 flex-shrink-0
                  ${area.priority === 'high' ? 'bg-red-100 text-red-800' : 
                    area.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-green-100 text-green-800'}`}>
                  {area.priority || 'medium'}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{area.area}</div>
                  {area.impact && (
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-secondary-600 mr-1">Impact:</span>
                      <div className="w-24 bg-secondary-200 rounded-full h-1.5 mr-1">
                        <div 
                          className={`h-1.5 rounded-full ${area.impact >= 8 ? 'bg-red-500' : area.impact >= 5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${(area.impact / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${
                        area.impact >= 8 ? 'text-red-600' : 
                        area.impact >= 5 ? 'text-yellow-600' : 
                        'text-green-600'
                      }`}>{area.impact}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Display individual metrics results */}
      <div className="space-y-3">
        {metricsResults && metricsResults.length > 0 ? (
          metricsResults.map((result) => (
            <div key={result.metric_id} className="border border-secondary-200 rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h6 className="font-medium">{result.metric_name || "Unknown Metric"}</h6>
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-medium
                    ${result.metric_type === 'task-specific' ? 'bg-primary-100 text-primary-800' : 'bg-secondary-100 text-secondary-800'}
                  `}>
                    {result.metric_type === 'task-specific' ? 'Task-specific' : 'Generic'}
                  </span>
                </div>
                <div className={`
                  px-2 py-1 rounded font-medium text-sm
                  ${getScoreClass(result.score)}
                `}>
                  Score: {formatScore(result.score)}/10
                </div>
              </div>
              <p className="text-sm text-secondary-700 mb-2">{result.details}</p>
              
              {/* Add key strengths and weaknesses if available */}
              {result.key_points && (result.key_points.strengths?.length > 0 || result.key_points.weaknesses?.length > 0) && (
                <div className="mt-3 space-y-2">
                  {result.key_points.strengths?.length > 0 && (
                    <div>
                      <h6 className="text-sm font-medium text-green-700">Strengths:</h6>
                      <ul className="list-disc list-inside text-sm text-secondary-700 pl-2">
                        {result.key_points.strengths.map((strength, idx) => (
                          <li key={idx}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.key_points.weaknesses?.length > 0 && (
                    <div>
                      <h6 className="text-sm font-medium text-red-700">Areas to Improve:</h6>
                      <ul className="list-disc list-inside text-sm text-secondary-700 pl-2">
                        {result.key_points.weaknesses.map((weakness, idx) => (
                          <li key={idx}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {/* Display improvement areas for this specific metric */}
              {result.improvement_areas && result.improvement_areas.length > 0 && (
                <div className="mt-4 pt-3 border-t border-secondary-200">
                  <div className="flex items-center mb-3">
                    <div className="w-1 h-5 bg-primary-500 rounded-r mr-2"></div>
                    <h6 className="text-sm font-medium text-primary-700">Improvement Areas</h6>
                    <span className="ml-auto bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
                      {result.improvement_areas.length} {result.improvement_areas.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div className="space-y-2 bg-secondary-50 rounded-md p-3">
                    {result.improvement_areas.map((area, idx) => (
                      <div key={idx} className="flex items-start bg-white rounded-md p-2 border border-secondary-200 shadow-sm">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium mr-2 flex-shrink-0
                          ${area.priority === 'high' ? 'bg-red-100 text-red-800' : 
                            area.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'}`}>
                          {area.priority || 'medium'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{area.area}</div>
                          {area.impact && (
                            <div className="flex items-center mt-1">
                              <span className="text-xs text-secondary-600 mr-1">Impact:</span>
                              <div className="w-24 bg-secondary-200 rounded-full h-1.5 mr-1">
                                <div 
                                  className={`h-1.5 rounded-full ${area.impact >= 8 ? 'bg-red-500' : area.impact >= 5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${(area.impact / 10) * 100}%` }}
                                ></div>
                              </div>
                              <span className={`text-xs font-medium ${
                                area.impact >= 8 ? 'text-red-600' : 
                                area.impact >= 5 ? 'text-yellow-600' : 
                                'text-green-600'
                              }`}>{area.impact}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center p-4 bg-secondary-50 rounded-md text-secondary-600">
            <p>No metrics evaluation available yet.</p>
            <p className="text-sm mt-1">Metrics will appear here after the call is completed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MetricsEvaluation; 