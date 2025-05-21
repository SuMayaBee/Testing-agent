import { fetchAPI } from './core';

// Base URL for the API
const API_BASE_URL = "https://phoneline-dashboard-backend-63qdm.ondigitalocean.app/api/v1";

// Call Analytics API functions
export const callAnalyticsAPI = {
  // Base URL exposed for direct access to recordings
  baseUrl: API_BASE_URL,
  
  // Get recording information for a specific recording SID
  getRecording: async (recordingSid) => {
    try {
      // Direct fetch (not using fetchAPI) to get the raw audio data
      const response = await fetch(`${API_BASE_URL}/call-analytics/recording/${recordingSid}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recording: ${response.status} ${response.statusText}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Error fetching recording:', error);
      throw error;
    }
  },
  
  // Get recording information by test ID
  getRecordingByTestId: async (organizationId, testId) => {
    return fetchAPI(
      `/voice-agent/recording/${testId}?organization_id=${organizationId}`,
      {},
      false // Disable caching
    );
  },
  
  // Get recordings for a call SID
  getRecordings: async (callSid) => {
    // For testing purpose, create a mock recording
    return [{
      sid: callSid,
      status: 'completed',
      duration: 415,
      date_created: new Date().toISOString(),
      url: `${API_BASE_URL}/call-analytics/recording/${callSid}`
    }];
  }
}; 