export * from './api/index';

// Call Analytics API endpoints
export const callAnalyticsAPI = {
  baseUrl: 'https://phoneline-dashboard-backend-63qdm.ondigitalocean.app/api/v1/call-analytics',

  // Get recordings for a call
  getRecordings: async (callSid) => {
    const response = await fetch(`${callAnalyticsAPI.baseUrl}/recordings/${callSid}`);
    if (!response.ok) {
      throw new Error('Failed to fetch recordings');
    }
    return response.json();
  },

  // Get a specific recording
  getRecording: async (recordingSid) => {
    const response = await fetch(`${callAnalyticsAPI.baseUrl}/recording/${recordingSid}`);
    if (!response.ok) {
      throw new Error('Failed to fetch recording');
    }
    return response.blob();
  },

  // Get call duration
  getCallDuration: async (callSid) => {
    const response = await fetch(`${callAnalyticsAPI.baseUrl}/get-call-duration/${callSid}`);
    if (!response.ok) {
      throw new Error('Failed to fetch call duration');
    }
    return response.json();
  }
};

// Firebase imports for real-time conversation fetching
import { db } from './firebase-config';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
