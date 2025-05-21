import { fetchAPI } from './core';

// Voice Agent API functions
export const voiceAgentAPI = {
  // Execute a test call
  runTestCall: (organizationId, testId, phoneNumber) => {
    return fetchAPI(
      `/voice-agent/execute/${testId}?organization_id=${organizationId}`,
      {
        method: "POST",
        body: JSON.stringify({
          to: phoneNumber,
        }),
      }
    );
  },

  // Execute multiple tests in batch (background execution)
  runBatchTests: (organizationId, testIds, phoneNumbers) => {
    return fetchAPI(
      `/voice-agent/execute-batch?organization_id=${organizationId}`,
      {
        method: "POST",
        body: JSON.stringify({
          test_ids: testIds,
          phone_numbers: phoneNumbers,
        }),
      }
    );
  },

  // Get test queue status
  getQueueStatus: (organizationId) => {
    return fetchAPI(
      `/voice-agent/queue-status?organization_id=${organizationId}`
    );
  },

  // Get transcript for a test
  getTranscript: (organizationId, testId, callSid = null) => {
    // Use the polling endpoint if callSid is provided
    const endpoint = callSid
      ? `/voice-agent/poll-transcript/${testId}?organization_id=${organizationId}&call_sid=${callSid}`
      : `/voice-agent/get-transcript/${testId}?organization_id=${organizationId}`;

    // Always disable caching for transcript polling to ensure fresh data
    return fetchAPI(endpoint, {}, false);
  },

  // Get call status
  getCallStatus: (organizationId, testId) => {
    return fetchAPI(
      `/voice-agent/call-status/${testId}?organization_id=${organizationId}`
    );
  },

  // Save conversation results to the backend
  saveConversation: (organizationId, testId, conversationData) => {
    return fetchAPI(
      `/voice-agent/save-conversation/${testId}?organization_id=${organizationId}`,
      {
        method: "POST",
        body: JSON.stringify(conversationData),
      }
    );
  },

  // Get all archived conversations for an organization
  getAllArchivedConversations: (organizationId) => {
    return fetchAPI(
      `/voice-agent/list-all-archived-conversations?organization_id=${organizationId}`
    );
  },

  // Get details of a specific archived conversation
  getArchivedConversation: (organizationId, testId, archiveId) => {
    return fetchAPI(
      `/voice-agent/get-archived-conversation/${testId}/${archiveId}?organization_id=${organizationId}`
    );
  },

  // Cancel an active test call
  cancelCall: (organizationId, testId, callSid = null) => {
    let endpoint = `/voice-agent/cancel-call/${testId}?organization_id=${organizationId}`;
    if (callSid) {
      endpoint += `&call_sid=${callSid}`;
    }

    return fetchAPI(endpoint, {
      method: "POST",
    });
  },
}; 