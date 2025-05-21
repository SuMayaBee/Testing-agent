import { fetchAPI, invalidateCache } from './core';

// Test API functions
export const testsAPI = {
  // Get all tests for an organization
  getTests: (organizationId) => {
    return fetchAPI(`/tests?organization_id=${organizationId}`);
  },

  // Get a specific test
  getTest: (organizationId, testId) => {
    return fetchAPI(`/tests/${testId}?organization_id=${organizationId}`);
  },

  // Create a new test
  createTest: (organizationId, userEmail, testData) => {
    const result = fetchAPI(
      `/tests?organization_id=${organizationId}&user_email=${userEmail}`,
      {
        method: "POST",
        body: JSON.stringify(testData),
      },
      false
    );

    // Invalidate tests list cache
    invalidateCache(`/tests?organization_id=${organizationId}`);

    return result;
  },

  // Update a test
  updateTest: (organizationId, testId, testData) => {
    const result = fetchAPI(
      `/tests/${testId}?organization_id=${organizationId}`,
      {
        method: "PUT",
        body: JSON.stringify(testData),
      },
      false
    );

    // Invalidate related caches
    invalidateCache(`/tests/${testId}`);
    invalidateCache(`/tests?organization_id=${organizationId}`);

    return result;
  },

  // Delete a test
  deleteTest: (organizationId, testId) => {
    const result = fetchAPI(
      `/tests/${testId}?organization_id=${organizationId}`,
      {
        method: "DELETE",
      },
      false
    );

    // Invalidate related caches
    invalidateCache(`/tests/${testId}`);
    invalidateCache(`/tests?organization_id=${organizationId}`);

    return result;
  },

  // Add a task to a test
  addTaskToTest: (organizationId, testId, taskId) => {
    return fetchAPI(
      `/tests/${testId}/tasks/${taskId}?organization_id=${organizationId}`,
      {
        method: "POST",
      }
    );
  },

  // Remove a task from a test
  removeTaskFromTest: (organizationId, testId, taskId) => {
    return fetchAPI(
      `/tests/${testId}/tasks/${taskId}?organization_id=${organizationId}`,
      {
        method: "DELETE",
      }
    );
  },

  // Add a metric to a test
  addMetricToTest: (organizationId, testId, metricId) => {
    return fetchAPI(
      `/tests/${testId}/metrics/${metricId}?organization_id=${organizationId}`,
      {
        method: "POST",
      }
    );
  },

  // Remove a metric from a test
  removeMetricFromTest: (organizationId, testId, metricId) => {
    return fetchAPI(
      `/tests/${testId}/metrics/${metricId}?organization_id=${organizationId}`,
      {
        method: "DELETE",
      }
    );
  },

  // Run a test (to be implemented with the simulations API)
  runTest: (organizationId, testId, configData) => {
    return fetchAPI(
      `/simulations/run?organization_id=${organizationId}&test_id=${testId}`,
      {
        method: "POST",
        body: JSON.stringify(configData),
      }
    );
  },

  // Clean test metrics
  cleanTestMetrics: (organizationId, testId) => {
    return fetchAPI(
      `/tests/${testId}/clean-metrics?organization_id=${organizationId}`
    );
  },
}; 