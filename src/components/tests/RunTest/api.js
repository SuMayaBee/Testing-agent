import { testsAPI, voiceAgentAPI, metricsAPI, tasksAPI } from '../../../lib/api';
import { normalizeScore } from './constants';

// Fetch test details and associated tasks/metrics
export async function fetchTestData(currentOrganizationUsername, testId, setTest, setTestTasks, setTestMetrics, setSelectedPhoneNumber) {
  const testData = await testsAPI.getTest(currentOrganizationUsername, testId);
  console.log("RunTest component - Loaded test data:", testData);
  setTest(testData);
  
  if (testData.target_phone_numbers.length > 0) {
    setSelectedPhoneNumber(testData.target_phone_numbers[0]);
  }
  
  // Fetch tasks and metrics associated with the test
  if (testData.tasks && testData.tasks.length > 0) {
    const tasksPromises = testData.tasks.map(taskId => 
      tasksAPI.getTask(currentOrganizationUsername, taskId)
    );
    const tasksData = await Promise.all(tasksPromises);
    console.log("Tasks Data: ", tasksData);
    setTestTasks(tasksData);
  }
  
  if (testData.metrics && testData.metrics.length > 0) {
    // Modify this part to handle 404 errors
    const metricsData = [];
    for (const metricId of testData.metrics) {
      try {
        const metric = await metricsAPI.getMetric(currentOrganizationUsername, metricId);
        metricsData.push(metric);
      } catch (err) {
        // If metric not found (404), just skip it
        console.warn(`Metric ${metricId} not found, skipping`, err);
      }
    }
    setTestMetrics(metricsData);
  }
  
  return testData;
}

// Refresh test metrics to ensure we have all the latest ones
export async function refreshTestMetrics(currentOrganizationUsername, testId, setTest, setTestTasks, setTestMetrics) {
  console.log("Refreshing metrics before running test");
  
  // Add timestamp to prevent caching
  const timestamp = Date.now();
  
  // Get fresh test data first to ensure we have the latest task list
  const updatedTest = await testsAPI.getTest(currentOrganizationUsername, testId, { _t: timestamp });
  console.log("Got fresh test data:", updatedTest);
  
  // First get generic metrics
  const genericMetrics = await metricsAPI.getMetrics(currentOrganizationUsername, 'generic');
  console.log("Got generic metrics:", genericMetrics.length);
  
  // Then get task-specific metrics
  const taskSpecificMetrics = await metricsAPI.getMetrics(currentOrganizationUsername, 'task-specific');
  console.log("Got task-specific metrics:", taskSpecificMetrics.length);
  
  // Combine all metrics
  const allMetrics = [...genericMetrics, ...taskSpecificMetrics];
  console.log("Total metrics:", allMetrics.length);
  
  // Get all tasks with a direct call to ensure we have the latest data
  const allTasks = await Promise.all(
    updatedTest.tasks.map(taskId => 
      tasksAPI.getTask(currentOrganizationUsername, taskId, { _t: timestamp })
    )
  );
  console.log("Got all tasks:", allTasks.length);
  
  // Update tasks state
  setTestTasks(allTasks);
  
  // Extract all generic metrics
  const genericMetricsResults = allMetrics.filter(metric => metric.type !== 'task-specific');
  console.log("Generic metrics:", genericMetricsResults.length);
  
  // Extract all task-specific metrics directly from the task data
  const taskSpecificMetricIds = [];
  allTasks.forEach(task => {
    if (task.task_specific_metrics && Array.isArray(task.task_specific_metrics)) {
      taskSpecificMetricIds.push(...task.task_specific_metrics);
    }
  });
  console.log("Task-specific metric IDs:", taskSpecificMetricIds.length);
  
  // Combine all relevant metric IDs (unique values only)
  const allRelevantMetricIds = [
    ...genericMetricsResults.map(m => m.id),
    ...taskSpecificMetricIds
  ];
  const uniqueMetricIds = [...new Set(allRelevantMetricIds)];
  console.log("Unique relevant metric IDs:", uniqueMetricIds.length);
  
  // Update test with all these metrics in parallel
  const updatePromises = uniqueMetricIds.map(async metricId => {
    try {
      await testsAPI.addMetricToTest(currentOrganizationUsername, testId, metricId);
    } catch (err) {
      console.log(`Metric ${metricId} might already be in test or not found: ${err.message}`);
    }
  });
  await Promise.all(updatePromises);
  
  // Get final test with updated metrics
  const finalTest = await testsAPI.getTest(currentOrganizationUsername, testId, { _t: timestamp });
  setTest(finalTest);
  
  // Fetch all metric details but handle 404 errors
  if (finalTest.metrics && finalTest.metrics.length > 0) {
    console.log("Fetching details for", finalTest.metrics.length, "metrics");
    const metricsData = [];
    
    for (const metricId of finalTest.metrics) {
      try {
        const metric = await metricsAPI.getMetric(currentOrganizationUsername, metricId, { _t: timestamp });
        metricsData.push(metric);
      } catch (err) {
        // If metric not found (404), just skip it
        console.warn(`Metric ${metricId} not found during refresh, skipping`, err);
      }
    }
    
    setTestMetrics(metricsData);
  }
  
  console.log("Metrics refresh complete");
  return true;
}

// Save conversation results
export async function saveConversation(
  currentOrganizationUsername, 
  testId, 
  selectedPhoneNumber, 
  transcript, 
  metricsResults, 
  overallScore, 
  test
) {
  // Use whichever transcript has content
  if (!transcript || transcript.length === 0) {
    throw new Error("Cannot save without transcript data");
  }
  
  console.log(`Saving transcript with ${transcript.length} messages`);
  console.log("Saving metrics results with scores:", metricsResults.map(m => ({id: m.metric_id, score: m.score})));
  console.log("Overall score being saved:", overallScore);
  
  // Make an actual API call to save the results to Firebase
  const result = await voiceAgentAPI.saveConversation(
    currentOrganizationUsername,
    testId,
    {
      transcript: transcript,
      metrics_results: metricsResults.reduce((acc, metric) => {
        // Ensure we're using the exact normalized score value
        const exactScore = normalizeScore(metric.score);
        
        acc[metric.metric_id] = {
          metric_name: metric.metric_name,
          metric_type: metric.metric_type,
          score: exactScore, // Store the normalized value
          details: { explanation: metric.details },
          improvement_areas: metric.improvement_areas
        };
        return acc;
      }, {}),
      overall_score: normalizeScore(overallScore),
      eval_metadata: transcript.length > 0 ? transcript[0].eval_metadata : null,
      call_status: 'completed',
      target_phone_number: selectedPhoneNumber,
      test_name: test?.name || 'Unknown Test',
      duration: transcript.length > 0 ? transcript.length * 10 : 0, // Rough estimate
      message_count: transcript.length
    }
  );
  
  return result;
}

// Clean test metrics
export async function cleanTestMetrics(currentOrganizationUsername, testId, setTest, setTestMetrics) {
  const result = await testsAPI.cleanTestMetrics(currentOrganizationUsername, testId);
  
  console.log("Cleaned metrics result:", result);
  
  // Refresh the test data
  const updatedTest = await testsAPI.getTest(currentOrganizationUsername, testId);
  setTest(updatedTest);
  
  // Re-fetch metrics
  if (updatedTest.metrics && updatedTest.metrics.length > 0) {
    const metricsData = [];
    for (const metricId of updatedTest.metrics) {
      try {
        const metric = await metricsAPI.getMetric(currentOrganizationUsername, metricId);
        metricsData.push(metric);
      } catch (err) {
        console.warn(`Metric ${metricId} not found, skipping`, err);
      }
    }
    setTestMetrics(metricsData);
  } else {
    setTestMetrics([]);
  }
  
  return result;
}

// Cancel a running test
export async function cancelTest(currentOrganizationUsername, testId, callSid = null) {
  console.log(`Cancelling test ${testId}${callSid ? ` with call SID ${callSid}` : ''}`);
  
  // Call the backend API to cancel the call
  const result = await voiceAgentAPI.cancelCall(
    currentOrganizationUsername,
    testId,
    callSid
  );
  
  console.log("Cancellation result:", result);
  return result;
} 