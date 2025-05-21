import { fetchAPI, invalidateCache } from './core';

// Task API functions
export const tasksAPI = {
  // Get all tasks for an organization
  getTasks: (organizationId) => {
    return fetchAPI(`/tasks?organization_id=${organizationId}`);
  },

  // Get a specific task
  getTask: (organizationId, taskId) => {
    if (!taskId) {
      console.error("API: getTask called with undefined taskId");
    }
    return fetchAPI(
      `/tasks/${encodeURIComponent(
        taskId
      )}?organization_id=${encodeURIComponent(organizationId)}`
    );
  },

  // Create a new task
  createTask: (organizationId, userEmail, taskData) => {
    const result = fetchAPI(
      `/tasks?organization_id=${encodeURIComponent(
        organizationId
      )}&user_email=${encodeURIComponent(userEmail)}`,
      {
        method: "POST",
        body: JSON.stringify(taskData),
      },
      false // Don't use cache for POST
    );

    // Invalidate the tasks list cache after creating a new task
    invalidateCache(`/tasks?organization_id=${organizationId}`);

    return result;
  },

  // Update a task
  updateTask: (organizationId, taskId, taskData) => {
    const result = fetchAPI(
      `/tasks/${encodeURIComponent(
        taskId
      )}?organization_id=${encodeURIComponent(organizationId)}`,
      {
        method: "PUT",
        body: JSON.stringify(taskData),
      },
      false // Don't use cache for PUT
    );

    // Invalidate related caches
    invalidateCache(`/tasks/${taskId}`);
    invalidateCache(`/tasks?organization_id=${organizationId}`);

    return result;
  },

  // Delete a task
  deleteTask: (organizationId, taskId) => {
    const result = fetchAPI(
      `/tasks/${taskId}?organization_id=${organizationId}`,
      {
        method: "DELETE",
      },
      false
    );

    // Invalidate related caches
    invalidateCache(`/tasks/${taskId}`);
    invalidateCache(`/tasks?organization_id=${organizationId}`);

    return result;
  },
}; 