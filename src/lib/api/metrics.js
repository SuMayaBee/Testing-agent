import { fetchAPI } from './core';

// Metrics API functions
export const metricsAPI = {
  // Get all metrics for an organization
  getMetrics: (organizationId, metricType = null) => {
    let endpoint = `/metrics?organization_id=${organizationId}`;
    if (metricType) {
      endpoint += `&metric_type=${metricType}`;
    }
    return fetchAPI(endpoint);
  },

  // Get a specific metric with more robust error handling
  getMetric: async (organizationId, metricId, params = {}) => {
    try {
      // Build the endpoint URL with any additional parameters
      let endpoint = `/metrics/${metricId}?organization_id=${organizationId}`;

      // Add any additional query parameters
      if (params) {
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value !== null && value !== undefined) {
            queryParams.append(key, value);
          }
        }

        const queryString = queryParams.toString();
        if (queryString) {
          endpoint += `&${queryString}`;
        }
      }

      return await fetchAPI(endpoint);
    } catch (error) {
      // If it's a 404 error, we'll throw a more specific error that can be handled
      if (
        error.message.includes("404") ||
        error.message.includes("not found")
      ) {
        console.warn(`Metric ${metricId} not found`);
        const notFoundError = new Error(`Metric ${metricId} not found`);
        notFoundError.status = 404;
        throw notFoundError;
      }
      // Otherwise, re-throw the original error
      throw error;
    }
  },

  // Create a new metric
  createMetric: (organizationId, userEmail, metricData) => {
    return fetchAPI(
      `/metrics?organization_id=${organizationId}&user_email=${userEmail}`,
      {
        method: "POST",
        body: JSON.stringify(metricData),
      }
    );
  },

  // Update a metric
  updateMetric: (organizationId, metricId, metricData) => {
    return fetchAPI(`/metrics/${metricId}?organization_id=${organizationId}`, {
      method: "PUT",
      body: JSON.stringify(metricData),
    });
  },

  // Delete a metric
  deleteMetric: (organizationId, metricId) => {
    return fetchAPI(`/metrics/${metricId}?organization_id=${organizationId}`, {
      method: "DELETE",
    });
  },

  // Get task-specific metrics for a task
  getTaskSpecificMetrics: (organizationId, taskId) => {
    return fetchAPI(
      `/metrics/task/${taskId}?organization_id=${organizationId}`
    );
  },
}; 